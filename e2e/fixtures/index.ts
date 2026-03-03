import type { Page } from '@playwright/test';

/**
 * Wait for React hydration at the app level. The `useHydratedAttribute()`
 * hook (mounted in the root component) sets `data-hydrated` on `<body>`
 * once React has hydrated.
 *
 * Most tests no longer need this — buttons are disabled until hydrated,
 * so Playwright's built-in actionability checks auto-wait. Use this
 * only when you need full hydration before a non-actionability-gated
 * operation (e.g. `dispatchEvent`, BroadcastChannel listener, a11y scan).
 *
 * @param page - Playwright page instance.
 */
export async function waitForHydration(page: Page): Promise<void> {
  await page.locator('body[data-hydrated]').waitFor();
}
