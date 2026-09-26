import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from './helpers';
import { choose, create, loadExample } from './reports';

// Stage 4b: choosing exactly what goes in, and Find's "Use these results".

test('steps need an answer before moving on, and Back works', async ({ page }) => {
  await page.goto('/#use');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Choose who it’s for.')).toBeVisible();
  await expectNoAxeViolations(page);
  await page.getByRole('radiogroup', { name: 'Choose one' }).getByText('A solicitor', { exact: true }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'What do they need?' })).toBeFocused();
  await page.getByRole('button', { name: 'Back' }).last().click();
  await expect(page.getByRole('heading', { name: 'Who is it for?' })).toBeFocused();
});

test('sections can be left out, and entries chosen one by one', async ({ page }) => {
  await loadExample(page);
  await choose(page, 'Just for me', 'Everything in my record');
  await expect(page.getByRole('checkbox', { name: 'Contacts' })).toBeChecked();
  await page.getByRole('checkbox', { name: 'Contacts' }).uncheck();

  const appts = page.getByRole('listitem').filter({ has: page.getByRole('checkbox', { name: 'Appointments' }) });
  await expect(appts).toContainText('3 of 3 entries');
  await appts.getByRole('button', { name: 'Choose entries' }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose entries: Appointments' });
  await expect(dialog.getByRole('checkbox')).toHaveCount(3);
  await expect(dialog).not.toContainText('PRIVATE');
  await expectNoAxeViolations(page);
  await dialog.getByRole('button', { name: 'Choose none' }).click();
  await dialog.getByRole('checkbox', { name: /Physiotherapy/ }).check();
  await dialog.getByRole('button', { name: 'Use these' }).click();
  await expect(appts).toContainText('1 of 3 entries');

  await create(page);
  const report = page.getByRole('article', { name: 'Full record' });
  await expect(report.getByRole('heading', { name: 'Contacts', exact: true })).toHaveCount(0);
  await expect(report).toContainText('Physiotherapy, St James’s');
  await expect(report).not.toContainText('Six-week review');

  await page.getByRole('button', { name: 'Change what’s included' }).click();
  await expect(page.getByRole('heading', { name: /^What goes in:/ })).toBeFocused();
  await expect(page.getByRole('checkbox', { name: 'Contacts' })).not.toBeChecked();
});

test('the private entries left out are listed by kind, without their contents', async ({ page }) => {
  await loadExample(page);
  await choose(page, 'A solicitor', 'A personal injury claim');
  await page.getByText('8 private entries are not included').click();
  await expect(page.getByText('1 letter or document', { exact: true })).toBeVisible();
  await expect(page.locator('main')).not.toContainText('PRIVATE');
});

test('Find’s results can be used in a report, leaving out private ones', async ({ page }) => {
  await loadExample(page);
  await page.goto('/#find');
  await page.getByRole('searchbox', { name: 'Search your record' }).fill('fracture clinic');
  await expect(page.getByRole('status')).toContainText('results');
  await page.getByRole('button', { name: 'Use these results in a report' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Use my record' })).toBeFocused();
  await expect(page.getByText(/^Using \d+ of your \d+ search results/)).toBeVisible();
  await choose(page, 'Just for me', 'Everything in my record');
  await expect(page.getByRole('checkbox', { name: 'Contacts' })).not.toBeChecked();
  await create(page);
  const report = page.getByRole('article', { name: 'Full record' });
  await expect(report).toContainText('Fracture clinic');
  await expect(report).not.toContainText('Northgate Distribution HR');
  await expect(page.locator('main')).not.toContainText('PRIVATE');
});
