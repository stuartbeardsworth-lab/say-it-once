import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The same Content-Security-Policy Netlify sends, so the browser tests run
// under the rules the real site runs under.
const csp = /Content-Security-Policy = "([^"]+)"/.exec(readFileSync(new URL('./netlify.toml', import.meta.url), 'utf8'))?.[1];
if (!csp) throw new Error('netlify.toml has no Content-Security-Policy');

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  plugins: [
    react(),
    // Makes Say It Once a home-screen app that works offline
    // (docs/architecture.md, "Offline"). Every file the app needs, including
    // the PDF maker and its font, is kept on the device when it's installed.
    VitePWA({
      // A new version waits until the person chooses to use it (see
      // UpdateNotice), so an update never reloads the page in the middle of
      // writing something.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Say It Once',
        short_name: 'Say It Once',
        description: 'Keep a record of what happened and how it affects you, so you don’t have to start again.',
        lang: 'en-GB',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#fbf8f5',
        theme_color: '#20433e',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,woff2}'],
        // The PDF maker and its font are large, but are needed offline too.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  // Relative asset paths, so the built app works from any folder or host.
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  preview: {
    headers: { 'Content-Security-Policy': csp },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Unit tests can reach the Building blocks page, as the browser tests do.
    env: { VITE_REVIEW_PAGES: '1' },
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
  },
});
