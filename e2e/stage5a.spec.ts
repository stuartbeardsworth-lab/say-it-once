import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations } from './helpers';
import { choose, create, loadExample } from './reports';

// Stage 5a: PDFs, sharing or saving them with honest results, the note in
// delete confirmations, and the app working offline.

async function pipReport(page: Page) {
  await loadExample(page);
  await choose(page, 'Benefits: the DWP or a form', 'A PIP claim or review');
  await create(page);
}

/** Pretends the device's share options can take files, and answers as given. */
async function fakeShare(page: Page, answer: 'share' | 'cancel') {
  await page.addInitScript((answer) => {
    const shared: string[] = [];
    Object.assign(window, { sharedFiles: shared });
    navigator.canShare = () => true;
    navigator.share = async (data?: ShareData) => {
      if (answer === 'cancel') throw new DOMException('Share cancelled', 'AbortError');
      for (const f of data?.files ?? []) shared.push(`${f.name}|${f.type}|${f.size}`);
    };
  }, answer);
}

async function openDeleteFor(page: Page, documentTitle: string) {
  await page.goto('/#documents');
  const item = page.getByRole('listitem').filter({ hasText: documentTitle });
  await item.getByRole('button', { name: 'Edit details' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  return page.getByRole('alertdialog', { name: 'Delete this document?' });
}

test('a PDF is made on the device and saved as a download', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(m.text());
  });
  await pipReport(page);
  await page.getByRole('button', { name: 'Make a PDF' }).click();
  const save = page.getByRole('button', { name: 'Save the PDF to this device' });
  await expect(save).toBeFocused({ timeout: 30_000 });
  await expect(page.getByRole('status').filter({ hasText: 'Your PDF is ready.' })).toBeVisible();
  await expectNoAxeViolations(page);

  const [download] = await Promise.all([page.waitForEvent('download'), save.click()]);
  expect(download.suggestedFilename()).toBe('Say It Once - PIP support pack - Example fall at work made up.pdf');
  const bytes = await (await download.createReadStream()).toArray();
  const pdf = Buffer.concat(bytes);
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  expect(pdf.length).toBeGreaterThan(10_000);
  await expect(page.getByText(/Your browser is saving “Say It Once/)).toBeVisible();
  // Nothing was blocked by the site's security rules while making it.
  expect(problems.filter((p) => /Content Security Policy|Refused/.test(p))).toEqual([]);

  // Deleting a letter that was in it says copies can't be taken back.
  const confirm = await openDeleteFor(page, 'Discharge letter');
  await expect(confirm).toContainText('This was in a report you shared or saved on');
});

test('sharing says only what is known, and closing the share options is not called sent', async ({ page }) => {
  await fakeShare(page, 'cancel');
  await pipReport(page);
  await page.getByRole('button', { name: 'Make a PDF' }).click();
  const share = page.getByRole('button', { name: 'Share the PDF' });
  await expect(share).toBeFocused({ timeout: 30_000 });
  await share.click();
  await expect(page.getByText('Not sent. The share options were closed without choosing an app.')).toBeVisible();
  await expect(page.getByText(/Passed to the app/)).toHaveCount(0);

  const confirm = await openDeleteFor(page, 'Discharge letter');
  await expect(confirm).toBeVisible();
  await expect(confirm).not.toContainText('in a report you shared');
});

test('a shared PDF is passed to the app chosen', async ({ page }) => {
  await fakeShare(page, 'share');
  await pipReport(page);
  await page.getByRole('button', { name: 'Make a PDF' }).click();
  await page.getByRole('button', { name: 'Share the PDF' }).click({ timeout: 30_000 });
  await expect(page.getByText('Passed to the app you chose. Check there that it was sent.')).toBeVisible();
  const shared = await page.evaluate(() => (window as unknown as { sharedFiles: string[] }).sharedFiles);
  expect(shared).toHaveLength(1);
  expect(shared[0]).toMatch(/\.pdf\|application\/pdf\|\d+$/);
});

test.describe('when the PDF maker can’t load', () => {
  // The service worker would answer from its copy, so keep it out of the way.
  test.use({ serviceWorkers: 'block' });

  test('it says so, and the message stays until dismissed', async ({ page }) => {
    await pipReport(page);
    await page.route(/pdfmake-.*\.js$/, (route) => route.abort());
    await page.getByRole('button', { name: 'Make a PDF' }).click();
    const alert = page.getByRole('alert').filter({ hasText: 'The PDF couldn’t be made. Nothing was shared or saved.' });
    await expect(alert).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /Share the PDF|Save the PDF/ })).toHaveCount(0);
    await expectNoAxeViolations(page);
    await page.waitForTimeout(2000);
    await expect(alert).toBeVisible();
    await alert.getByRole('button', { name: 'Dismiss this message' }).click();
    await expect(alert).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Try making the PDF again' })).toBeVisible();
  });
});

test('it can be added to a home screen, and works offline, PDFs included', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Offline mode is checked in Chromium; the phone check is done by hand.');
  await page.goto('/#home');
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBeTruthy();
  const manifest = await (await page.request.get(manifestHref ?? '')).json();
  expect(manifest).toMatchObject({ name: 'Say It Once', display: 'standalone' });
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toContain('512x512');

  // Wait until everything the app needs has been kept on the device.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await pipReport(page);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Use my record' })).toBeVisible();
  await choose(page, 'Benefits: the DWP or a form', 'A PIP claim or review');
  await create(page);
  await page.getByRole('button', { name: 'Make a PDF' }).click();
  await expect(page.getByRole('button', { name: 'Save the PDF to this device' })).toBeVisible({ timeout: 30_000 });
  await context.setOffline(false);
});
