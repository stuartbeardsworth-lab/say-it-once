import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations } from './helpers';

// Stage 3b: How it affects me and Keep track. The same steps as
// docs/stage-3b-walkthrough.md.

async function open(page: Page, hash: string) {
  await page.goto(`/${hash}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Loading…')).toHaveCount(0);
}

function inFuture(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const pdf = { name: 'letter.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test letter') };

test('an area is described, changed (keeping the old version) and corrected (replacing it)', async ({ page }) => {
  await open(page, '#impact');
  await page.getByRole('button', { name: 'Choose an area that’s changed' }).click();
  await page.getByRole('dialog', { name: 'Choose an area' }).getByRole('button', { name: 'Washing and bathing' }).click();
  const area = page.getByRole('dialog', { name: 'Washing and bathing' });
  await area.getByText('I find this very difficult').click();
  await area.getByRole('textbox', { name: 'Tell us what happens' }).fill('I need help getting in the shower.');
  await expectNoAxeViolations(page);
  await area.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('I need help getting in the shower.')).toBeVisible();

  await page.getByRole('button', { name: 'Something has changed' }).click();
  await page.getByRole('dialog', { name: 'Something has changed' }).getByRole('button', { name: 'Washing and bathing' }).click();
  await area.getByText('It is harder now').click();
  await area.getByRole('textbox', { name: 'Tell us what happens' }).fill('I can shower with a stool now.');
  await area.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('I can shower with a stool now.')).toBeVisible();

  await page.getByRole('button', { name: 'Edit' }).first().click();
  await area.getByRole('button', { name: 'Save' }).click();
  await expect(area.getByText('Choose whether something has changed or you’re correcting it.')).toBeVisible();
  await area.getByText('I’m correcting what I wrote. Replace it.').click();
  await area.getByRole('textbox', { name: 'Tell us what happens' }).fill('I can shower using a stool now.');
  await area.getByRole('button', { name: 'Save' }).click();

  await page.getByRole('link', { name: 'See changes over time' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Changes over time' })).toBeFocused();
  await expect(page.getByText('I can shower using a stool now.')).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Earlier: from/ })).toHaveCount(1);
  await expect(page.getByText('I need help getting in the shower.')).toBeVisible();
  await expect(page.getByText('I can shower with a stool now.')).toHaveCount(0);
  await expectNoAxeViolations(page);
});

test('a check-in needs one answer, and appears in changes over time', async ({ page }) => {
  await open(page, '#impact');
  await page.getByRole('button', { name: 'Add a check-in' }).click();
  const dialog = page.getByRole('dialog', { name: 'Health and wellbeing check-in' });
  await dialog.getByRole('button', { name: 'Save check-in' }).click();
  await expect(dialog.getByText('Choose how your pain is, how you feel, or add a note.')).toBeVisible();
  await dialog.getByText('Medium', { exact: true }).click();
  await dialog.getByText('Okay', { exact: true }).click();
  await dialog.getByRole('button', { name: 'Save check-in' }).click();
  await expect(page.getByText('Pain: Medium · Feeling: Okay')).toBeVisible();
  await page.getByRole('link', { name: 'See changes over time' }).click();
  await expect(page.getByRole('table')).toContainText('Medium');
});

test('an appointment with a letter: saved, shown on Home, added to the calendar, deleted keeping the letter', async ({ page }) => {
  await open(page, '#appointments');
  await page.getByRole('button', { name: 'Add an appointment' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add an appointment' });
  await dialog.getByRole('button', { name: 'Save appointment' }).click();
  await expect(dialog.getByText('Add the date of the appointment.')).toBeVisible();
  await expect(dialog.getByText('Add who the appointment is with.')).toBeVisible();
  await expectNoAxeViolations(page);

  await dialog.getByLabel('Date').fill(inFuture(7));
  await dialog.getByLabel('Time (optional)').fill('09:30');
  await dialog.getByRole('combobox', { name: 'Who is it with?' }).fill('Fracture clinic');
  await dialog.getByRole('textbox', { name: 'What is it for? (optional)' }).fill('Check-up');
  // A photo of the letter can be taken straight from the camera, or a file chosen.
  await expect(dialog.getByLabel('Take a photo of the letter')).toHaveAttribute('capture', 'environment');
  await dialog.getByLabel('Choose a file').setInputFiles(pdf);
  await expect(dialog.getByText('Attached: letter.pdf')).toBeVisible();
  await expect(dialog.getByLabel('Take a photo of the letter')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Save appointment' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Appointment saved.' })).toBeVisible();
  await expect(page.getByRole('link', { name: /View the letter/ })).toBeVisible();

  // Straight after adding, the calendar is offered under the message, as well as on the card.
  const addToCalendar = page.getByRole('button', { name: 'Add to my calendar' });
  await expect(addToCalendar).toHaveCount(2);
  const download = page.waitForEvent('download');
  await addToCalendar.first().click();
  expect((await download).suggestedFilename()).toMatch(/Fracture-clinic.*\.ics$/);
  await expect(page.getByRole('status').filter({ hasText: /saving .*\.ics/ })).toBeVisible();
  await expect(addToCalendar).toHaveCount(1);

  await open(page, '#home');
  await expect(page.getByRole('region', { name: 'Your next appointment' })).toContainText('Fracture clinic');

  await open(page, '#appointments');
  await page.getByRole('button', { name: 'Delete' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Delete this appointment?' });
  await expect(confirm.getByRole('checkbox', { name: 'Also delete the letter saved with it' })).not.toBeChecked();
  await confirm.getByRole('button', { name: 'Delete appointment' }).click();
  await expect(page.getByText('No upcoming appointments.')).toBeVisible();
  await open(page, '#documents');
  await expect(page.getByRole('heading', { name: 'Appointment letter — Fracture clinic' })).toBeVisible();
});

test('a private appointment can’t be added to the calendar', async ({ page }) => {
  await open(page, '#appointments');
  await page.getByRole('button', { name: 'Add an appointment' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add an appointment' });
  await dialog.getByLabel('Date').fill(inFuture(3));
  await dialog.getByRole('combobox', { name: 'Who is it with?' }).fill('Counsellor');
  await dialog.getByRole('checkbox', { name: 'Keep this private' }).check();
  await dialog.getByRole('button', { name: 'Save appointment' }).click();
  await expect(page.getByText('Private appointments can’t be added to your calendar.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add to my calendar' })).toHaveCount(0);
});

test('treatment can be repeated, and medication added', async ({ page }) => {
  await open(page, '#treatment');
  await page.getByRole('button', { name: 'Add a treatment' }).click();
  const treat = page.getByRole('dialog', { name: 'Add a treatment' });
  await treat.getByRole('textbox', { name: 'What was the treatment?' }).fill('Physiotherapy');
  await treat.getByRole('button', { name: 'Save treatment' }).click();
  await page.getByRole('button', { name: 'Add another like one before' }).click();
  await page.getByRole('dialog', { name: 'Repeat a previous treatment' }).getByRole('button', { name: 'Physiotherapy' }).click();
  await expect(treat.getByRole('textbox', { name: 'What was the treatment?' })).toHaveValue('Physiotherapy');
  await treat.getByRole('button', { name: 'Save treatment' }).click();
  await expect(page.getByRole('heading', { name: 'Physiotherapy' })).toHaveCount(2);

  await page.getByRole('button', { name: 'Add a medication' }).click();
  const med = page.getByRole('dialog', { name: 'Add a medication' });
  await med.getByRole('textbox', { name: 'Name of the medication' }).fill('Naproxen');
  await med.getByRole('button', { name: 'Save medication' }).click();
  await expect(page.getByRole('heading', { name: 'Naproxen' })).toBeVisible();
  await expectNoAxeViolations(page);
});

test('costs add up, and a wrong amount is explained', async ({ page }) => {
  await open(page, '#costs');
  await page.getByRole('button', { name: 'Add money spent' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add money spent' });
  await dialog.getByRole('textbox', { name: 'What was it for?' }).fill('Taxi to hospital');
  await dialog.getByLabel('Date').fill('2026-03-14');
  await dialog.getByRole('textbox', { name: 'Amount in pounds (optional)' }).fill('twelve');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog.getByText('Enter an amount in pounds and pence, such as 12.50.')).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Amount in pounds (optional)' }).fill('12.50');
  await dialog.getByRole('button', { name: 'Save' }).click();

  await page.getByRole('button', { name: 'Add income lost' }).click();
  const income = page.getByRole('dialog', { name: 'Add income lost' });
  await income.getByRole('textbox', { name: 'What income was lost?' }).fill('Wages');
  await income.getByLabel('From').fill('2026-03-15');
  await income.getByLabel('To (optional)').fill('2026-03-31');
  await income.getByRole('textbox', { name: 'Amount in pounds (optional)' }).fill('£1,000');
  await income.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('.totals')).toContainText('Money spent£12.50');
  await expect(page.locator('.totals')).toContainText('Income lost£1,000.00');
  await expect(page.locator('.totals')).toContainText('Together£1,012.50');
  await expectNoAxeViolations(page);
  await open(page, '#track');
  await expect(page.getByRole('link', { name: /Costs & lost income/ })).toContainText('£12.50 spent · £1,000.00 lost');
});

test('a document is added with a file, and needs a file or a name', async ({ page }) => {
  await open(page, '#documents');
  await page.getByRole('button', { name: 'Add a letter or document' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add a letter or document' });
  await dialog.getByRole('button', { name: 'Save document' }).click();
  await expect(dialog.getByText('Add a name for this document, or add the file.')).toBeVisible();
  await dialog.getByLabel('Choose a file').setInputFiles(pdf);
  await dialog.getByRole('button', { name: 'Save document' }).click();
  await expect(page.getByRole('heading', { name: 'letter.pdf' })).toBeVisible();
  await expect(page.getByRole('link', { name: /View the document/ })).toBeVisible();
  await expectNoAxeViolations(page);
});

test('contacts: added, linked, exported, and private ones are left out of exports', async ({ page }) => {
  await open(page, '#contacts');
  await page.getByRole('button', { name: 'Add a contact' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add a contact' });
  await dialog.getByRole('textbox', { name: 'Name or organisation' }).fill('Headway helpline');
  await dialog.getByRole('textbox', { name: 'Phone number or email' }).fill('0808 800 2244');
  await dialog.getByRole('button', { name: 'Save contact' }).click();
  await expect(page.getByRole('link', { name: '0808 800 2244' })).toHaveAttribute('href', 'tel:08088002244');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Add to my contacts' }).click();
  expect((await download).suggestedFilename()).toBe('Headway-helpline.vcf');

  await page.getByRole('button', { name: 'Add a contact' }).click();
  await dialog.getByRole('textbox', { name: 'Name or organisation' }).fill('Private counsellor');
  await dialog.getByRole('checkbox', { name: 'Keep this private' }).check();
  await dialog.getByRole('button', { name: 'Save contact' }).click();
  await expect(page.getByRole('button', { name: 'Add to my contacts' })).toHaveCount(1);
  await expect(page.locator('.print-contacts')).not.toContainText('Private counsellor');
  await expect(page.locator('.print-contacts')).toContainText('Headway helpline');
  await expectNoAxeViolations(page);
});

test('Add something offers all eight kinds, and opens the appointment form from Home', async ({ page }) => {
  await open(page, '#home');
  await page.getByRole('button', { name: 'Add something' }).click();
  const chooser = page.getByRole('dialog', { name: 'Add something' });
  await expect(chooser.getByRole('button')).toHaveCount(9);
  await chooser.getByRole('button', { name: 'An appointment' }).click();
  await expect(page.getByRole('dialog', { name: 'Add an appointment' })).toBeVisible();
});
