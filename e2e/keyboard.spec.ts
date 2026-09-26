import { expect, test, type Locator, type Page } from '@playwright/test';

// The automated half of docs/stage-1-walkthrough.md. Everything here is done
// with the keyboard only.

test.skip(({ isMobile }) => isMobile, 'Keyboard walkthrough is for desktop browsers');

/** Presses Tab until the given control has focus. */
async function tabTo(page: Page, target: Locator, maxPresses = 40) {
  for (let i = 0; i < maxPresses; i++) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error(`Could not reach ${target.toString()} with Tab`);
}

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

test('skip link is first, visible when focused, and moves focus to the content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page).toHaveURL(/\/$/);
});

test('navigating by keyboard moves focus to the new page heading, and Back returns', async ({ page }) => {
  await page.goto('/');
  await tabTo(page, page.getByRole('navigation', { name: 'Help and settings' }).getByRole('link', { name: 'Privacy & backup' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy & backup' })).toBeFocused();
  await expect(page).toHaveTitle('Privacy & backup – Say It Once');

  await tabTo(page, button(page, 'Back'));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: /Keep everything together/ })).toBeFocused();

  // The browser's own Forward button works too.
  await page.goForward();
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy & backup' })).toBeFocused();
});

test('text size can be changed with the keyboard and scales the whole page', async ({ page }) => {
  await page.goto('/');
  const bodySize = () => page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
  const before = await bodySize();

  await tabTo(page, button(page, 'Text size'));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Text size' })).toBeVisible();
  await tabTo(page, page.getByRole('radio', { name: 'Standard' }));
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio', { name: 'Largest' })).toBeChecked();
  await page.keyboard.press('Escape');

  await expect(page.getByRole('button', { name: 'Text size' })).toBeFocused();
  expect(await bodySize()).toBeCloseTo(before * 1.75, 1);
});

test('dialog: focus moves in, is trapped, Escape closes, focus returns', async ({ page }) => {
  await page.goto('/#building-blocks');
  await tabTo(page, button(page, 'Open an example dialog'));
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Example dialog' });
  await expect(dialog).toBeVisible();

  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  }
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Shift+Tab');
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  }

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Open an example dialog' })).toBeFocused();
});

test('confirm dialog: focus starts on Cancel, Escape cancels, confirming works', async ({ page }) => {
  await page.goto('/#building-blocks');
  const trigger = page.getByRole('button', { name: 'Delete example item' });

  await tabTo(page, button(page, 'Delete example item'));
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('alertdialog', { name: 'Delete this example?' });
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Delete example' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page.getByText('The example was deleted.')).toBeVisible();
  await expect(trigger).toBeFocused();
});

test('save failure stays until dismissed', async ({ page }) => {
  await page.goto('/#building-blocks');
  await tabTo(page, button(page, 'Show a failed save'));
  await page.keyboard.press('Enter');
  const alert = page.getByRole('alert').filter({ hasText: 'Not saved' });
  await expect(alert).toBeVisible();
  await page.waitForTimeout(5000);
  await expect(alert).toBeVisible();
  await tabTo(page, button(page, 'Dismiss this message'));
  await page.keyboard.press('Enter');
  await expect(alert).toBeHidden();
});
