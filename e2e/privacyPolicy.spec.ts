import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from './helpers';

// The privacy policy is a plain page (public/privacy-policy.html) that app
// stores link to, so it must work on its own, without the app's scripts.

test('the privacy policy opens from Privacy & backup, and passes the accessibility checks', async ({ page }) => {
  await page.goto('/#privacy');
  await page.getByRole('link', { name: 'Read the full privacy policy' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeVisible();
  await expect(page.getByText('your record stays on your device', { exact: false })).toBeVisible();
  await expectNoAxeViolations(page);
});

test('the privacy policy reads without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/privacy-policy.html');
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeVisible();
  await context.close();
});
