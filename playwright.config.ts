import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

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
      name: 'chromium:authenticated',
      testMatch: [],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
    },
    {
      name: 'chromium:public',
      use: {
        ...devices['Desktop Chrome'],
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
