import { expect, type Page } from '@playwright/test';

// Going through Use my record's steps in a browser test.

export async function loadExample(page: Page) {
  await page.goto('/#help');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Load the example record' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Use my record' })).toBeFocused();
}

/** Chooses who it's for and what they need, then waits on "What goes in". */
export async function choose(page: Page, audience: string, need: string) {
  await page.getByRole('radiogroup', { name: 'Choose one' }).getByText(audience, { exact: true }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  // Some needs share their wording with an audience, so wait for the second
  // step before choosing, or the click can land on the first step's answer.
  await expect(page.getByRole('heading', { name: 'What do they need?' })).toBeFocused();
  await page.getByRole('radiogroup', { name: 'Choose one' }).getByText(need).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: /^What goes in:/ })).toBeFocused();
}

export async function create(page: Page) {
  await page.getByRole('button', { name: 'Create the report' }).click();
  await expect(page.getByRole('heading', { name: 'Your report' })).toBeFocused();
}
