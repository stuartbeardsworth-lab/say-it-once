import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations } from './helpers';

// Stage 4a: the privacy filter and reports, seen through the made-up
// example record. Every private entry in it contains the word PRIVATE.

async function loadExample(page: Page) {
  await page.goto('/#building-blocks');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Load the example record' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Use my record' })).toBeFocused();
}

const purposeSelect = (page: Page) => page.getByLabel('Who is it for, and what do they need?');

test('no report, for any purpose, shows anything private', async ({ page }) => {
  await loadExample(page);
  await expect(page.getByText(/private entries are not included/)).toBeVisible();
  const values = await purposeSelect(page).locator('option').evaluateAll((opts) =>
    opts.map((o) => (o as HTMLOptionElement).value).filter(Boolean),
  );
  expect(values).toHaveLength(15);
  for (const value of values) {
    await purposeSelect(page).selectOption(value);
    const report = page.getByRole('article').first();
    await expect(report).toBeVisible();
    await expect(report, value).not.toContainText('PRIVATE');
    await expect(page.locator('main'), value).not.toContainText('PRIVATE');
  }
});

test('a PIP pack shows the evidence index, the confirmation and the personal-information warning', async ({ page }) => {
  await loadExample(page);
  await purposeSelect(page).selectOption('pip');
  const report = page.getByRole('article', { name: 'PIP support pack' });
  await expect(report.getByRole('heading', { name: 'How it affects me' })).toBeVisible();
  await expect(report.getByRole('heading', { name: 'Evidence index' })).toBeVisible();
  await expect(report.getByRole('heading', { name: 'Confirmation' })).toBeVisible();
  const warning = page.getByRole('note', { name: 'Before you share this' });
  await expect(warning).toContainText('How you manage using the toilet');
  await expect(page.getByRole('button', { name: 'Print' })).toBeVisible();
  await expectNoAxeViolations(page);
});

test('a summary has no signature lines', async ({ page }) => {
  await loadExample(page);
  await purposeSelect(page).selectOption('appointment-brief');
  const report = page.getByRole('article', { name: 'Appointment brief' });
  await expect(report.getByRole('heading', { name: 'Current position' })).toBeVisible();
  await expect(report.getByRole('heading', { name: 'Confirmation' })).toHaveCount(0);
});

test('the IIDB pack asks for work details when they are missing, and uses them once added', async ({ page }) => {
  await page.goto('/#use');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await purposeSelect(page).selectOption('iidb');
  await page.getByRole('button', { name: 'Add your work details' }).click();
  const dialog = page.getByRole('dialog', { name: 'Work at the time' });
  await dialog.getByRole('textbox', { name: 'Employer' }).fill('Northgate Distribution');
  await dialog.getByRole('button', { name: 'Save work details' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Add your work details' })).toHaveCount(0);
  await expect(page.getByRole('article', { name: 'IIDB support pack' })).toContainText('Northgate Distribution');
});

test('work details can be added from What happened', async ({ page }) => {
  await page.goto('/#what');
  await expect(page.getByText('Loading…')).toHaveCount(0);
  await page.getByRole('button', { name: 'Add work details' }).click();
  const dialog = page.getByRole('dialog', { name: 'Work at the time' });
  await dialog.getByRole('textbox', { name: 'Your job' }).fill('Warehouse operative');
  await dialog.getByRole('button', { name: 'Save work details' }).click();
  await expect(page.getByText('Warehouse operative')).toBeVisible();
});
