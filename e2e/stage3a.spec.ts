import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations } from './helpers';

// Stage 3a: Home, Quick Notes and filing, My records, What happened.
// The same steps as docs/stage-3a-walkthrough.md.

async function openApp(page: Page, hash = '#home') {
  await page.goto(`/${hash}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

async function writeNote(page: Page, text: string, how: 'save' | 'file' = 'save') {
  await page.getByRole('button', { name: 'Quick Note', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Quick Note' });
  await dialog.getByRole('textbox', { name: 'Your note' }).fill(text);
  await dialog.getByRole('button', { name: how === 'save' ? 'Save as Quick Note' : 'Save and file it now' }).click();
}

test('a Quick Note saved from Home appears as the latest note and on Quick Notes', async ({ page }) => {
  await openApp(page);
  await writeNote(page, 'Physio said keep doing the stretches');
  await expect(page.getByRole('status').filter({ hasText: 'Quick Note saved.' })).toBeVisible();
  const latest = page.getByRole('region', { name: 'Your latest Quick Note' });
  await expect(latest).toContainText('Physio said keep doing the stretches');
  await expect(latest).toContainText('Not filed yet');
  await page.getByRole('link', { name: 'See all Quick Notes' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Quick Notes' })).toBeFocused();
  await expect(page.getByText('1 note hasn’t been filed yet.')).toBeVisible();
  await expectNoAxeViolations(page);
});

test('a note can be filed in an area of How it affects me, then unfiled', async ({ page }) => {
  await openApp(page);
  await writeNote(page, 'Stairs are hard today', 'file');
  const dialog = page.getByRole('dialog', { name: 'File this Quick Note' });
  await expect(dialog).toBeVisible();
  await expectNoAxeViolations(page);
  await dialog.getByText('How it affects me', { exact: true }).click();
  await dialog.getByText('Walking and moving around').click();
  await dialog.getByRole('button', { name: 'File note' }).click();
  await expect(dialog).toBeHidden();
  const latest = page.getByRole('region', { name: 'Your latest Quick Note' });
  await expect(latest).toContainText('Filed in How it affects me: Walking and moving around');

  await latest.getByRole('button', { name: 'Change where it’s filed' }).click();
  await dialog.getByRole('button', { name: 'Remove from How it affects me' }).click();
  await expect(latest).toContainText('Not filed yet');
});

test('filing asks you to choose a section first', async ({ page }) => {
  await openApp(page);
  await writeNote(page, 'Unsure where', 'file');
  const dialog = page.getByRole('dialog', { name: 'File this Quick Note' });
  await dialog.getByRole('button', { name: 'File note' }).click();
  await expect(dialog.getByText('Choose where to file this note.')).toBeVisible();
});

test('a note with a photo filed in Letters & documents keeps the photo', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Quick Note', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Quick Note' });
  await dialog.getByLabel('Add a photo').setInputFiles({
    name: 'letter.png',
    mimeType: 'image/png',
    // A 1 by 1 pixel PNG.
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    ),
  });
  await expect(dialog.getByRole('img', { name: 'The photo saved with this note' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Save and file it now' }).click();
  const filing = page.getByRole('dialog', { name: 'File this Quick Note' });
  await filing.getByText('Letters & documents', { exact: true }).click();
  await filing.getByRole('button', { name: 'File note' }).click();
  await expect(page.getByRole('region', { name: 'Your latest Quick Note' })).toContainText('Filed in Letters & documents');
  await page.reload();
  await expect(page.getByRole('img', { name: /Photo saved with this note/ })).toBeVisible();
});

test('closing a Quick Note with unsaved words asks first', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Quick Note', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Quick Note' });
  await dialog.getByRole('textbox', { name: 'Your note' }).fill('Half a thought');
  await page.keyboard.press('Escape');
  await expect(dialog.getByRole('alert').filter({ hasText: 'This hasn’t been saved' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Keep editing' })).toBeFocused();
  await expectNoAxeViolations(page);
  await page.keyboard.press('Enter');
  await expect(dialog.getByRole('textbox', { name: 'Your note' })).toHaveValue('Half a thought');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await dialog.getByRole('button', { name: 'Discard this note' }).click();
  await expect(dialog).toBeHidden();
});

test('an empty Quick Note is not saved', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Quick Note', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Quick Note' });
  await dialog.getByRole('button', { name: 'Save as Quick Note' }).click();
  await expect(dialog.getByText('Write a few words, or add a photo.')).toBeVisible();
});

test('a note can be edited and deleted', async ({ page }) => {
  await openApp(page);
  await writeNote(page, 'First version');
  await page.getByRole('link', { name: 'See all Quick Notes' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit Quick Note' });
  await dialog.getByRole('textbox', { name: 'Your note' }).fill('Second version');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Second version')).toBeVisible();
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete note' }).click();
  await expect(page.getByText('No Quick Notes yet.')).toBeVisible();
});

test('What happened saves as you type and is there after reloading', async ({ page }) => {
  await openApp(page, '#what');
  await page.getByRole('textbox', { name: 'What happened?' }).fill('I slipped on the stairs at work.');
  await page.getByRole('textbox', { name: 'Where did it happen?' }).fill('Office stairwell');
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  await page.getByText('Other details').click();
  await page.getByRole('textbox', { name: 'Injuries or symptoms' }).fill('Sprained wrist');
  await page.getByRole('textbox', { name: 'Injuries or symptoms' }).blur();
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  await expectNoAxeViolations(page);
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'What happened?' })).toHaveValue('I slipped on the stairs at work.');
  await expect(page.getByRole('textbox', { name: 'Where did it happen?' })).toHaveValue('Office stairwell');
});

test('records: add, switch, rename and delete, and each keeps its own notes', async ({ page }) => {
  await openApp(page);
  await writeNote(page, 'Note in the first record');

  await page.getByRole('link', { name: 'My records' }).click();
  await page.getByRole('button', { name: 'Add another record' }).click();
  const add = page.getByRole('dialog', { name: 'Add another record' });
  await add.getByRole('textbox', { name: 'Name of the record' }).fill('Fall at work, March 2026');
  await add.getByRole('button', { name: 'Add record' }).click();
  await expect(page.getByText('“Fall at work, March 2026” was added and is now being shown.')).toBeVisible();
  await expect(page.getByText('Record: Fall at work, March 2026')).toBeVisible();
  await expectNoAxeViolations(page);

  await page.getByRole('link', { name: 'Quick Notes', exact: true }).click();
  await expect(page.getByText('No Quick Notes yet.')).toBeVisible();

  await page.getByRole('link', { name: 'My records' }).click();
  await page.getByRole('button', { name: 'Show this record' }).click();
  await page.getByRole('link', { name: 'Quick Notes', exact: true }).click();
  await expect(page.getByText('Note in the first record')).toBeVisible();

  await page.getByRole('link', { name: 'My records' }).click();
  await page.getByRole('button', { name: 'Rename' }).first().click();
  const rename = page.getByRole('dialog', { name: 'Rename this record' });
  await rename.getByRole('textbox', { name: 'Name of the record' }).fill('Car accident, 2025');
  await rename.getByRole('button', { name: 'Save name' }).click();
  await expect(page.getByText('Car accident, 2025 (being shown)')).toBeVisible();

  await page.getByRole('listitem').filter({ hasText: 'Fall at work' }).getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete this record' }).click();
  await expect(page.getByText('“Fall at work, March 2026” was deleted.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
});

test('your name is saved for every record', async ({ page }) => {
  await openApp(page, '#records');
  await page.getByRole('textbox', { name: 'Your name (optional)' }).fill('Sam Taylor');
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Your name (optional)' })).toHaveValue('Sam Taylor');
});
