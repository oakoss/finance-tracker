import { defineConfig, devices } from '@playwright/test';

import { E2E_USER_COUNT } from '~e2e/fixtures/constants';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Strip defaultBrowserType so iPhone uses Chromium instead of WebKit
// (avoids requiring a WebKit install). Pixel already defaults to
// Chromium; destructured for consistency.
const { defaultBrowserType: _iphone, ...iPhone } = devices['iPhone 15 Pro Max'];
const { defaultBrowserType: _pixel, ...pixel } = devices['Pixel 7'];

export default defineConfig({
  expect: { timeout: 10_000 },
  failOnFlakyTests: !!process.env.CI,
  forbidOnly: !!process.env.CI,
  fullyParallel: true,
  outputDir: 'test-results',
  projects: [
    { name: 'db-setup', testDir: 'e2e/setup', testMatch: 'db.setup.ts' },
    {
      dependencies: ['db-setup'],
      grep: /@authenticated/,
      name: 'chromium:authenticated',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      dependencies: ['db-setup'],
      grepInvert: [/@authenticated/, /@demo/],
      name: 'chromium:public',
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
    },
    {
      grep: /@demo/,
      name: 'chromium:demo',
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
    },

    // iPhone (Chromium with iPhone viewport/UA)
    {
      dependencies: ['db-setup'],
      grep: /@authenticated/,
      name: 'iphone:authenticated',
      use: { ...iPhone },
    },
    {
      dependencies: ['db-setup'],
      grepInvert: [/@authenticated/, /@demo/],
      name: 'iphone:public',
      use: { ...iPhone, storageState: { cookies: [], origins: [] } },
    },

    // Pixel (Chromium with Pixel viewport/UA)
    {
      dependencies: ['db-setup'],
      grep: /@authenticated/,
      name: 'pixel:authenticated',
      use: { ...pixel },
    },
    {
      dependencies: ['db-setup'],
      grepInvert: [/@authenticated/, /@demo/],
      name: 'pixel:public',
      use: { ...pixel, storageState: { cookies: [], origins: [] } },
    },
  ],
  reporter: process.env.CI ? [['github'], ['blob']] : 'html',
  retries: process.env.CI ? 2 : 0,
  testDir: './e2e',
  timeout: 30_000,
  use: {
    actionTimeout: 10_000,
    baseURL: BASE_URL,
    navigationTimeout: 15_000,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  webServer: {
    command: process.env.CI ? 'pnpm start' : 'pnpm dev',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: BASE_URL,
  },
  workers: process.env.CI ? 2 : E2E_USER_COUNT,
});
