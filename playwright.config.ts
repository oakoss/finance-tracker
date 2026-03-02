import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Strip defaultBrowserType so iPhone uses Chromium instead of WebKit
// (avoids requiring a WebKit install). Pixel already defaults to
// Chromium; destructured for consistency.
const { defaultBrowserType: _iphone, ...iPhone } = devices['iPhone 15 Pro Max'];
const { defaultBrowserType: _pixel, ...pixel } = devices['Pixel 7'];

export default defineConfig({
  expect: {
    timeout: 5000,
  },
  failOnFlakyTests: !!process.env.CI,
  forbidOnly: !!process.env.CI,
  fullyParallel: true,
  outputDir: 'test-results',
  projects: [
    { name: 'setup', testDir: 'e2e/setup', testMatch: '*.setup.ts' },
    {
      dependencies: ['setup'],
      grep: /@authenticated/,
      name: 'chromium:authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
    },
    {
      grepInvert: /@authenticated/,
      name: 'chromium:public',
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
    },

    // iPhone (Chromium with iPhone viewport/UA)
    {
      dependencies: ['setup'],
      grep: /@authenticated/,
      name: 'iphone:authenticated',
      use: {
        ...iPhone,
        storageState: 'playwright/.auth/user.json',
      },
    },
    {
      grepInvert: /@authenticated/,
      name: 'iphone:public',
      use: {
        ...iPhone,
        storageState: { cookies: [], origins: [] },
      },
    },

    // Pixel (Chromium with Pixel viewport/UA)
    {
      dependencies: ['setup'],
      grep: /@authenticated/,
      name: 'pixel:authenticated',
      use: {
        ...pixel,
        storageState: 'playwright/.auth/user.json',
      },
    },
    {
      grepInvert: /@authenticated/,
      name: 'pixel:public',
      use: {
        ...pixel,
        storageState: { cookies: [], origins: [] },
      },
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
    command: 'pnpm dev',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: BASE_URL,
  },
  workers: process.env.CI ? 1 : undefined,
});
