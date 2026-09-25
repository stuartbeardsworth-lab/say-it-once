import { defineConfig, devices } from '@playwright/test';

// A machine that already has a Chromium build (such as a cloud dev container)
// can point Playwright at it with PW_CHROMIUM_EXECUTABLE instead of
// downloading one. CI installs the browsers normally.
const chromiumExecutable = process.env.PW_CHROMIUM_EXECUTABLE;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(chromiumExecutable && { launchOptions: { executablePath: chromiumExecutable } }),
      },
    },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'iphone', use: { ...devices['iPhone 15'] } },
  ],
  // Tests run against the production build, which is what people will use.
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
