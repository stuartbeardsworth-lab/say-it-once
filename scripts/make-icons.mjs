// Draws the app icons in public/ from one design, using the Chromium that
// Playwright already has. Run with `node scripts/make-icons.mjs` after
// changing the design. The icon is a placeholder until a final one is chosen.
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const teal = '#1d4f5c';

/** `inset` keeps the letters inside the safe area that phones may crop to a circle. */
function svg(size, { rounded, inset }) {
  const radius = rounded ? size * 0.18 : 0;
  const fontSize = size * (inset ? 0.3 : 0.38);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${teal}"/>
  <text x="50%" y="50%" dy="0.35em" text-anchor="middle" fill="#ffffff"
    font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${fontSize}">SiO</text>
</svg>`;
}

const icons = [
  { file: 'icon-192.png', size: 192, rounded: false, inset: false },
  { file: 'icon-512.png', size: 512, rounded: false, inset: false },
  { file: 'icon-maskable-512.png', size: 512, rounded: false, inset: true },
  // iPhones round the corners themselves.
  { file: 'apple-touch-icon.png', size: 180, rounded: false, inset: false },
];

const browser = await chromium.launch(process.env.PW_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PW_CHROMIUM_EXECUTABLE } : {});
const page = await browser.newPage();
for (const icon of icons) {
  await page.setViewportSize({ width: icon.size, height: icon.size });
  await page.setContent(`<body style="margin:0">${svg(icon.size, icon)}</body>`);
  await page.screenshot({ path: `public/${icon.file}`, omitBackground: true });
}
await writeFile('public/favicon.svg', svg(64, { rounded: true, inset: false }));
await browser.close();
console.log('Icons written to public/');
