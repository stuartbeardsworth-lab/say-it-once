// Makes the Google Play store images in docs/play-store/ from the real app,
// with the fictional example record loaded: four phone screenshots
// (1080 x 1920) and the feature graphic (1024 x 500).
//
// Build and serve the app first, then run:
//   npm run build && npx vite preview --port 4173
//   node scripts/store-images.mjs
// The callbacks passed to evaluate() run inside the page.
/* global document, window */
import { chromium } from '@playwright/test';

const base = process.env.APP_URL ?? 'http://localhost:4173/';
const out = 'docs/play-store';
const browser = await chromium.launch(process.env.PW_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PW_CHROMIUM_EXECUTABLE } : {});

// 360 x 640 at 3x gives 1080 x 1920, the usual Play Store phone size.
const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });

async function settle() {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}

await page.goto(`${base}#how-to-use`);
await page.getByRole('button', { name: 'Load the example record' }).click();
await page.getByRole('heading', { level: 1, name: 'Use my record' }).waitFor();

await page.goto(`${base}#home`);
await page.getByRole('button', { name: 'Not now' }).click().catch(() => undefined);
await page.mouse.move(0, 0);
await settle();
await page.screenshot({ path: `${out}/1-home.png` });

await page.getByRole('button', { name: 'Quick Note' }).click();
await page.getByRole('dialog', { name: 'Quick Note' }).getByRole('textbox').first().fill('Physio said to keep up the stretches twice a day. Knee still swells after the stairs.');
await settle();
await page.screenshot({ path: `${out}/2-quick-note.png` });
await page.keyboard.press('Escape');
await page.getByRole('button', { name: /Keep|Close|Discard/ }).first().click().catch(() => undefined);

await page.goto(`${base}#track`);
await settle();
await page.screenshot({ path: `${out}/3-keep-track.png` });

await page.goto(`${base}#use`);
await page.getByRole('radiogroup', { name: 'Choose one' }).getByText('A solicitor', { exact: true }).click();
await page.getByRole('button', { name: 'Continue' }).click();
await page.getByRole('heading', { name: 'What do they need?' }).waitFor();
await page.getByRole('radiogroup', { name: 'Choose one' }).getByText('A personal injury claim').click();
await page.getByRole('button', { name: 'Continue' }).click();
await page.getByRole('button', { name: 'Create the report' }).click();
await page.getByRole('heading', { name: 'Your report' }).waitFor();
await page.getByRole('heading', { name: 'Your report' }).evaluate((h) => window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - 16));
await settle();
await page.screenshot({ path: `${out}/4-report.png` });

// The feature graphic: the logo, name and promise on navy.
const graphic = await browser.newPage({ viewport: { width: 1024, height: 500 } });
await graphic.setContent(`<!doctype html><html><head><style>
  body { margin: 0; width: 1024px; height: 500px; background: #20433e; color: #fff;
    font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; gap: 48px; }
  svg { width: 200px; height: 200px; overflow: visible; }
  h1 { font-size: 72px; margin: 0; letter-spacing: -0.02em; }
  p { font-size: 30px; margin: 12px 0 0; }
  .promise { font-size: 26px; font-weight: 700; margin-top: 28px; }
  .promise span { color: #e8714a; }
</style></head><body>
  <svg viewBox="0 0 240 240"><path d="M20 16 h176 a28 28 0 0 1 28 28 v92 a28 28 0 0 1 -28 28 h-92 l-40 40 v-40 h-36 a28 28 0 0 1 -28 -28 v-92 a28 28 0 0 1 28 -28 z" fill="none" stroke="#fff" stroke-width="20" stroke-linejoin="round"/><circle cx="108" cy="86" r="16" fill="#e8714a"/></svg>
  <div><h1>Say It Once</h1><p>No need to relive it.</p>
  <p class="promise">Record it <span>→</span> Keep it together <span>→</span> Use it</p></div>
</body></html>`);
await graphic.screenshot({ path: `${out}/feature-graphic.png` });

await browser.close();
console.log(`Store images written to ${out}/`);
