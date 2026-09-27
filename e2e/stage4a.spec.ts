import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from './helpers';
import { choose, create, loadExample } from './reports';

// Stage 4a: the privacy filter and reports, seen through the made-up
// example record. Every private entry in it contains the word PRIVATE.

const every: [string, string][] = [
  ['A doctor, nurse or therapist', 'Getting ready for an appointment'],
  ['A doctor, nurse or therapist', 'A short overview of my health'],
  ['A doctor, nurse or therapist', 'What has changed recently'],
  ['Benefits: the DWP or a form', 'A PIP claim or review'],
  ['Benefits: the DWP or a form', 'Industrial Injuries Disablement Benefit'],
  ['Benefits: the DWP or a form', 'Another benefit or form'],
  ['A solicitor', 'A personal injury claim'],
  ['A solicitor', 'Concerns about medical treatment'],
  ['An insurer', 'An overview for an insurer'],
  ['An insurer', 'Costs or lost income'],
  ['An insurer', 'Evidence for a claim'],
  ['My employer or occupational health', 'My employer or occupational health'],
  ['Family or someone who supports me', 'Family or someone who supports me'],
  ['Just for me', 'A personal overview'],
  ['Just for me', 'Everything in my record'],
];

test('no report, for any purpose, shows anything private', async ({ page }) => {
  test.setTimeout(120_000);
  await loadExample(page);
  for (const [audience, need] of every) {
    // Going to #use while already there keeps the old step, so start afresh.
    await page.goto('/#use');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Who is it for?' })).toBeVisible();
    await choose(page, audience, need);
    await expect(page.getByText(/private entries are not included/)).toBeVisible();
    await expect(page.locator('main'), need).not.toContainText('PRIVATE');
    await create(page);
    await expect(page.getByRole('article').first()).toBeVisible();
    await expect(page.locator('main'), need).not.toContainText('PRIVATE');
  }
});

test('a PIP pack shows the evidence index, the confirmation and the personal-information warning', async ({ page }) => {
  await loadExample(page);
  await choose(page, 'Benefits: the DWP or a form', 'A PIP claim or review');
  await expectNoAxeViolations(page);
  await create(page);
  const report = page.getByRole('article', { name: 'PIP support pack' });
  await expect(report.getByRole('heading', { name: 'How it affects me' })).toBeVisible();
  await expect(report.getByRole('heading', { name: 'Evidence index' })).toBeVisible();
  await expect(report.getByRole('heading', { name: 'Confirmation' })).toBeVisible();
  await expect(page.getByRole('note', { name: 'Before you share this' })).toContainText('How you manage using the toilet');
  await expect(page.getByRole('button', { name: 'Print' })).toBeVisible();
  await expectNoAxeViolations(page);
});

test('a summary has no signature lines', async ({ page }) => {
  await loadExample(page);
  await choose(page, 'A doctor, nurse or therapist', 'Getting ready for an appointment');
  await create(page);
  const report = page.getByRole('article', { name: 'Appointment brief' });
  await expect(report.getByRole('heading', { name: 'How things are now' })).toBeVisible();
  await expect(report.getByRole('heading', { name: 'Confirmation' })).toHaveCount(0);
});

test('the IIDB pack asks for work details when they are missing, and uses them once added', async ({ page }) => {
  await page.goto('/#use');
  await expect(page.getByRole('heading', { name: 'Who is it for?' })).toBeVisible();
  await choose(page, 'Benefits: the DWP or a form', 'Industrial Injuries Disablement Benefit');
  await page.getByRole('button', { name: 'Add your work details' }).click();
  const dialog = page.getByRole('dialog', { name: 'Work at the time' });
  await dialog.getByRole('textbox', { name: 'Employer' }).fill('Northgate Distribution');
  await dialog.getByRole('button', { name: 'Save work details' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Add your work details' })).toHaveCount(0);
  await create(page);
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
