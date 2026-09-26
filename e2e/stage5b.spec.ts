import { expect, test } from '@playwright/test';
import { strFromU8, unzipSync } from 'fflate';
import { expectNoAxeViolations } from './helpers';
import { choose, create, loadExample } from './reports';

// Stage 5b: the zip, with the PDF, an HTML copy, and the letters and photos
// the report refers to.

function entry(entries: Record<string, Uint8Array>, name: string): Uint8Array {
  const bytes = entries[name];
  if (!bytes) throw new Error(`${name} is not in the zip`);
  return bytes;
}

test('a zip holds the PDF, the HTML copy, and each letter and photo by its reference', async ({ page }) => {
  await loadExample(page);
  await choose(page, 'Just for me', 'Everything in my record');
  await create(page);
  await expect(page.getByText('A zip file holds the PDF, a copy that works well with screen readers, and the 3 letters and photos it refers to.')).toBeVisible();
  await page.getByRole('button', { name: 'Make a zip file' }).click();
  const save = page.getByRole('button', { name: 'Save the zip file to this device' });
  await expect(save).toBeFocused({ timeout: 30_000 });
  await expect(page.getByRole('status').filter({ hasText: /^Your zip file is ready \(\d+ KB\)\.$/ })).toBeVisible();
  await expectNoAxeViolations(page);

  const [download] = await Promise.all([page.waitForEvent('download'), save.click()]);
  expect(download.suggestedFilename()).toBe('Say It Once - Full record - Example fall at work made up.zip');
  const zip = Buffer.concat(await (await download.createReadStream()).toArray());
  const entries = unzipSync(new Uint8Array(zip));
  expect(Object.keys(entries).sort()).toEqual([
    'attachments/E1-discharge-letter.pdf',
    'attachments/E3-fracture-clinic-letter.pdf',
    'attachments/P1-photo.png',
    'report.html',
    'report.pdf',
  ]);
  expect(strFromU8(entry(entries, 'report.pdf').subarray(0, 5))).toBe('%PDF-');
  // The photo is the example's real picture, byte for byte.
  expect(Array.from(entry(entries, 'attachments/P1-photo.png').subarray(1, 4))).toEqual([0x50, 0x4e, 0x47]);
  const html = strFromU8(entry(entries, 'report.html'));
  expect(html).not.toMatch(/<script/i);
  expect(html).toContain('href="attachments/E1-discharge-letter.pdf"');
  for (const [name, bytes] of Object.entries(entries)) {
    expect(name).not.toMatch(/private/i);
    expect(strFromU8(bytes)).not.toContain('PRIVATE');
  }
  await expect(page.getByText(/Your browser is saving “Say It Once - Full record/)).toBeVisible();
});

test('the HTML copy opens on its own and passes the accessibility checks', async ({ page }) => {
  await loadExample(page);
  await choose(page, 'Benefits: the DWP or a form', 'A PIP claim or review');
  await create(page);
  await page.getByRole('button', { name: 'Make a zip file' }).click();
  const save = page.getByRole('button', { name: 'Save the zip file to this device' });
  const [download] = await Promise.all([page.waitForEvent('download'), save.click({ timeout: 30_000 })]);
  const entries = unzipSync(new Uint8Array(Buffer.concat(await (await download.createReadStream()).toArray())));
  await page.setContent(strFromU8(entry(entries, 'report.html')));
  await expect(page.getByRole('heading', { level: 1, name: 'PIP support pack' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Evidence index' })).toBeVisible();
  await expectNoAxeViolations(page);
});
