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
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
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
