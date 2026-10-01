import { expect, test, type Page } from '@playwright/test';
import { strFromU8, unzipSync } from 'fflate';
import { readFile } from 'node:fs/promises';
import { expectNoAxeViolations } from './helpers';
import { loadExample } from './reports';

// Stage 6a: saving a backup, restoring it, the reminder, and deleting
// everything on this device.

async function saveBackup(page: Page, path: string) {
  await page.goto('/#privacy');
  await page.getByRole('radiogroup', { name: 'Lock it with a password?' }).getByText('No, don’t lock it').click();
  await page.getByRole('button', { name: 'Make a backup' }).click();
  const save = page.getByRole('button', { name: 'Save the backup to this device' });
  await expect(save).toBeFocused({ timeout: 30_000 });
  const [download] = await Promise.all([page.waitForEvent('download'), save.click()]);
  expect(download.suggestedFilename()).toMatch(/^Say It Once backup \d{4}-\d{2}-\d{2}\.zip$/);
  await download.saveAs(path);
  await expect(page.getByText(/^Last backup saved from this device: /)).toBeVisible();
}

async function chooseBackup(page: Page, path: string | { name: string; mimeType: string; buffer: Buffer }) {
  await page.goto('/#privacy');
  // Wait until the app has finished starting, as a person would.
  await expect(page.getByText(/^(No backup has been saved|Last backup saved)/)).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(path);
}

test('a backup made on one device restores everything on another, private entries included', async ({ page, browser }, info) => {
  const path = info.outputPath('backup.zip');
  await loadExample(page);
  await saveBackup(page, path);

  // The file says itself that it isn't encrypted, and holds the private entries.
  const entries = unzipSync(new Uint8Array(await readFile(path)));
  expect(strFromU8(entries['manifest.json'] ?? new Uint8Array())).toContain('not encrypted');
  expect(Object.values(entries).some((b) => strFromU8(b).includes('PRIVATE'))).toBe(true);

  // A second device: a fresh browser with nothing stored.
  const other = await browser.newContext();
  const phone = await other.newPage();
  await chooseBackup(phone, path);
  await expect(phone.getByRole('heading', { name: /^In this backup, saved / })).toBeFocused();
  await expect(phone.getByText('Example: fall at work (made up)')).toBeVisible();
  await expectNoAxeViolations(phone);
  await phone.getByRole('button', { name: 'Restore 2 records' }).click();
  await expect(phone.getByRole('heading', { name: 'Restored' })).toBeFocused();

  await phone.getByRole('link', { name: 'My records' }).first().click();
  const example = phone.getByRole('listitem').filter({ hasText: 'Example: fall at work (made up)' });
  await example.getByRole('button', { name: 'Show this record' }).click();
  await phone.goto('/#documents');
  await expect(phone.getByText('Discharge letter')).toBeVisible();
  await expect(phone.getByText('PRIVATE: Counselling assessment')).toBeVisible();
  await other.close();
});

test('a locked backup can only be opened with its password, and then restores everything', async ({ page, browser }, info) => {
  test.setTimeout(90_000);
  const path = info.outputPath('backup.sayitonce');
  await loadExample(page);
  await page.goto('/#privacy');
  // Locking is the choice already made; a weak password and the unticked box are both caught first.
  await expect(page.getByRole('radio', { name: 'Yes, lock it' })).toBeChecked();
  const password = page.getByRole('textbox', { name: 'Password for this backup' });
  await password.fill('password1234');
  await page.getByRole('button', { name: 'Make a backup' }).click();
  await expect(page.getByText('That password is too well known. Try four ordinary words instead.')).toBeVisible();
  await expect(page.getByText('Please write the password down first, then tick the box.')).toBeVisible();
  await page.getByRole('button', { name: 'Suggest a password' }).click();
  await expect(password).toHaveValue(/^\S+ \S+ \S+ \S+$/);
  await password.fill('purple harbour lantern seven');
  await page.getByRole('checkbox', { name: 'I’ve written the password down' }).check();
  await expectNoAxeViolations(page);
  await page.getByRole('button', { name: 'Make a backup' }).click();
  const save = page.getByRole('button', { name: 'Save the backup to this device' });
  await expect(save).toBeFocused({ timeout: 60_000 });
  const [download] = await Promise.all([page.waitForEvent('download'), save.click()]);
  expect(download.suggestedFilename()).toMatch(/^Say It Once backup \d{4}-\d{2}-\d{2} \(locked\)\.sayitonce$/);
  await download.saveAs(path);

  // Nothing in the file can be read without the password.
  const bytes = await readFile(path);
  expect(bytes.subarray(0, 23).toString()).toBe('SAYITONCE-LOCKED-BACKUP');
  expect(bytes.includes(Buffer.from('PRIVATE'))).toBe(false);
  expect(bytes.includes(Buffer.from('Discharge letter'))).toBe(false);

  const other = await browser.newContext();
  const phone = await other.newPage();
  await chooseBackup(phone, path);
  await expect(phone.getByRole('heading', { name: 'This backup is locked' })).toBeFocused();
  await expectNoAxeViolations(phone);
  const typed = phone.getByRole('textbox', { name: 'Password', exact: true });
  await typed.fill('purple harbour lantern');
  await phone.getByRole('button', { name: 'Unlock' }).click();
  await expect(phone.getByText(/^That password doesn’t open this backup/)).toBeVisible({ timeout: 30_000 });
  await typed.fill('purple harbour lantern seven');
  await phone.getByRole('button', { name: 'Unlock' }).click();
  await expect(phone.getByRole('heading', { name: /^In this backup, saved / })).toBeFocused({ timeout: 30_000 });
  await phone.getByRole('button', { name: 'Restore 2 records' }).click();
  await expect(phone.getByRole('heading', { name: 'Restored' })).toBeFocused();
  await other.close();
});

test('restoring on the same device leaves the record alone unless a copy is chosen', async ({ page }, info) => {
  const path = info.outputPath('backup.zip');
  await loadExample(page);
  await saveBackup(page, path);
  await chooseBackup(page, path);

  const choice = page.getByRole('radiogroup', { name: '“Example: fall at work (made up)” is already on this device' });
  await expect(choice.getByRole('radio', { name: 'Leave it out' })).toBeChecked();
  await page.getByRole('radiogroup', { name: '“My record” is already on this device' }).getByText('Leave it out').click();
  await expect(page.getByRole('button', { name: 'Nothing to restore' })).toBeDisabled();
  await choice.getByText('Restore it as a separate copy').click();
  await page.getByRole('button', { name: 'Restore 1 record' }).click();
  await expect(page.getByText('“Example: fall at work (made up) (restored copy)” is now on this device.')).toBeVisible();

  await page.goto('/#records');
  await expect(page.getByText('Example: fall at work (made up) (restored copy)')).toBeVisible();
  await expect(page.getByText('Example: fall at work (made up)', { exact: true })).toBeVisible();
});

test('a file that isn’t a backup is refused, and nothing changes', async ({ page }) => {
  await chooseBackup(page, { name: 'not-a-backup.zip', mimeType: 'application/zip', buffer: Buffer.from('hello') });
  const alert = page.getByRole('alert').filter({ hasText: 'This file isn’t a Say It Once backup, or it has been damaged. Nothing has been changed.' });
  await expect(alert).toBeVisible();
  await expectNoAxeViolations(page);
});

test('the reminder on Home appears for a record with real content, and Not now hides it', async ({ page }) => {
  await loadExample(page);
  await page.goto('/#home');
  const reminder = page.getByRole('complementary', { name: 'Keep a copy of your record safe' });
  const phoneBox = page.getByRole('complementary', { name: 'Keep Say It Once on your phone' });
  await expect(reminder).toBeVisible();
  // One reminder at a time: the Add to phone box waits, and its link is there instead.
  await expect(phoneBox).toHaveCount(0);
  const links = page.getByRole('navigation', { name: 'Help and settings' });
  await expect(links.getByRole('link', { name: 'Add to phone' })).toBeVisible();
  await reminder.getByRole('button', { name: 'Not now' }).click();
  await expect(reminder).toHaveCount(0);
  await expect(phoneBox).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(reminder).toHaveCount(0);
});

test('saving a backup stops the reminder', async ({ page }, info) => {
  await loadExample(page);
  await saveBackup(page, info.outputPath('backup.zip'));
  await page.goto('/#home');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Keep a copy of your record safe' })).toHaveCount(0);
});

test('deleting everything asks first, then leaves an empty app', async ({ page }) => {
  await loadExample(page);
  await page.goto('/#privacy');
  await page.getByRole('button', { name: 'Delete everything on this device' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Delete everything on this device?' });
  await expect(confirm.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await expectNoAxeViolations(page);
  await confirm.getByRole('button', { name: 'Delete everything' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Keep everything together/ })).toBeVisible();
  await page.goto('/#records');
  await expect(page.getByText('Example: fall at work (made up)')).toHaveCount(0);
  await expect(page.getByRole('main').getByRole('listitem')).toHaveText([/^My record \(being shown\)/]);
});
