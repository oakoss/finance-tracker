import type { Page } from '@playwright/test';

/**
 * Wait for React hydration. The root component sets `data-hydrated`
 * on `<body>` once React has hydrated. Authenticated tests get this
 * automatically via the page.goto override in the auth fixture.
 */
export async function waitForHydration(page: Page): Promise<void> {
  await page.locator('body[data-hydrated]').waitFor();
}
