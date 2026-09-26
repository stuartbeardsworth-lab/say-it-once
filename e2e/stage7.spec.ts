import { expect, test } from '@playwright/test';

// Stage 7: the encryption module runs in real browsers, under the site's
// Content-Security-Policy (WebAssembly allowed, nothing else added).

test('encryption works in this browser, and the speed check reports a time', async ({ page }) => {
  test.setTimeout(120_000);
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(m.text());
  });
  await page.goto('/#building-blocks');
  await page.getByRole('button', { name: 'Run the check' }).click();
  await expect(page.getByText(/^Unlocking took [\d.]+ seconds \(3 passes, 64 MB of memory\)\. Encryption on this device: works\.$/)).toBeVisible({
    timeout: 90_000,
  });
  expect(problems.filter((p) => /Content Security Policy|Refused|WebAssembly/.test(p))).toEqual([]);
});
