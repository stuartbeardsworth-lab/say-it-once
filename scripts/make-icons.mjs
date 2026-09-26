// Draws the app icons in public/ from the Say It Once logo (a white speech
// bubble with an orange dot, on navy, as in the original app), using the
// Chromium that Playwright already has. Run with `node scripts/make-icons.mjs`
// after changing the design. The logo's shape matches src/components/Logo.tsx.
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const navy = '#20433e';
const orange = '#e8714a';
const bubble =
  'M20 16 h176 a28 28 0 0 1 28 28 v92 a28 28 0 0 1 -28 28 h-92 l-40 40 v-40 h-36 a28 28 0 0 1 -28 -28 v-92 a28 28 0 0 1 28 -28 z';

/**
 * `scale` is how much of the square the 240-unit logo fills. Maskable icons
 * use a smaller logo so it stays inside the circle some phones crop to.
 */
function svg(size, { rounded, scale }) {
  const radius = rounded ? size * 0.18 : 0;
  const logo = size * scale;
  const offset = (size - logo) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${navy}"/>
  <g transform="translate(${offset} ${offset + logo * 0.03}) scale(${logo / 240})">
    <path d="${bubble}" fill="none" stroke="#ffffff" stroke-width="20" stroke-linejoin="round"/>
    <circle cx="108" cy="86" r="16" fill="${orange}"/>
  </g>
</svg>`;
}

const icons = [
  { file: 'icon-192.png', size: 192, rounded: false, scale: 0.7 },
  { file: 'icon-512.png', size: 512, rounded: false, scale: 0.7 },
  { file: 'icon-maskable-512.png', size: 512, rounded: false, scale: 0.56 },
  // iPhones round the corners themselves.
  { file: 'apple-touch-icon.png', size: 180, rounded: false, scale: 0.7 },
];

const browser = await chromium.launch(process.env.PW_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PW_CHROMIUM_EXECUTABLE } : {});
const page = await browser.newPage();
for (const icon of icons) {
  await page.setViewportSize({ width: icon.size, height: icon.size });
  await page.setContent(`<body style="margin:0">${svg(icon.size, icon)}</body>`);
  await page.screenshot({ path: `public/${icon.file}`, omitBackground: true });
}
await writeFile('public/favicon.svg', svg(64, { rounded: true, scale: 0.78 }));
await browser.close();
console.log('Icons written to public/');
