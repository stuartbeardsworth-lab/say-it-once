import { expect, test, type Page } from '@playwright/test';
import { chooseTextSize, expectNoAxeViolations } from './helpers';

// The Stage 2 checks from docs/stage-2-walkthrough.md, in a real browser
// with real IndexedDB.

async function typeNote(page: Page, text: string) {
  const box = page.getByRole('textbox', { name: 'Try a Quick Note' });
  await box.fill(text);
  return box;
}

/** Opens the review page and waits until the record has loaded. */
async function openReview(page: Page) {
  await page.goto('/#building-blocks');
  await expect(page.getByRole('heading', { name: 'Quick Notes saved on this device' })).toBeVisible();
  await expect(page.getByText('Loading…')).toBeHidden();
}

const savedNotes = (page: Page) => page.getByRole('list').filter({ has: page.getByText(/^Saved /) });

test('a Quick Note is saved as you type and is still there after reloading', async ({ page }) => {
  await openReview(page);
  await typeNote(page, 'Saw the GP about my knee');
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  await page.reload();
  await expect(savedNotes(page)).toContainText('Saw the GP about my knee');
});

test('a second tab sees new notes without reloading', async ({ page, context }) => {
  await openReview(page);
  const other = await context.newPage();
  await openReview(other);
  await typeNote(page, 'Written in the first tab');
  await expect(savedNotes(other)).toContainText('Written in the first tab');
});

test('a failed save says why, keeps the words, and the next save works', async ({ page }) => {
  await openReview(page);
  await page.getByLabel('Should the next save fail?').selectOption('full');
  const box = await typeNote(page, 'Important words');
  const alert = page.getByRole('alert').filter({ hasText: 'Not saved' });
  await expect(alert).toContainText('run out of space');
  await expect(box).toHaveValue('Important words');
  await expectNoAxeViolations(page);

  await box.fill('Important words, again');
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  await expect(savedNotes(page)).toContainText('Important words, again');
});

test('when storage is unavailable every screen says so, nothing saves, and Try again recovers', async ({ page }) => {
  await openReview(page);
  await page.getByRole('button', { name: 'Pretend storage is unavailable' }).click();
  const banner = page.getByRole('alert').filter({ hasText: 'can’t save on this device' });
  await expect(banner).toBeVisible();
  await expectNoAxeViolations(page);

  await typeNote(page, 'This should not be kept');
  await expect(page.getByRole('alert').filter({ hasText: 'Not saved' })).toBeVisible();

  // Moving around inside the app keeps the pretend failure: Home, then Privacy & backup.
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(banner).toBeVisible();
  await page.getByRole('navigation', { name: 'Help and settings' }).getByRole('link', { name: 'Privacy & backup' }).click();
  await expect(banner).toBeVisible();
  await banner.getByRole('button', { name: 'Try again' }).click();
  await expect(banner).toBeHidden();
});

test('deleting a note asks first and then removes it', async ({ page }) => {
  await openReview(page);
  await typeNote(page, 'Delete me');
  await expect(savedNotes(page)).toContainText('Delete me');
  await page.getByRole('button', { name: 'Delete this note' }).first().click();
  const dialog = page.getByRole('alertdialog', { name: 'Delete this Quick Note?' });
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Delete note' }).click();
  await expect(page.getByText('None yet.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('None yet.')).toBeVisible();
});

test('the text size is remembered after reloading', async ({ page }) => {
  await page.goto('/');
  await chooseTextSize(page, 'Larger');
  await page.reload();
  await expect.poll(() => page.evaluate(() => document.documentElement.style.fontSize)).toBe('150%');
});

test('Privacy & backup shows the space used on this device', async ({ page }) => {
  await page.goto('/#privacy');
  await page.getByText('Space on this device').click();
  await expect(page.getByText(/Say It Once is using .* of storage on this device/)).toBeVisible();
});
