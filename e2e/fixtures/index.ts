import type { Page } from '@playwright/test';

/**
 * Wait for React hydration. The root component sets `data-hydrated`
 * on `<body>` once React has hydrated. Authenticated tests get this
 * automatically via the page.goto override in the auth fixture.
 *
 * This is not a signal that the page is interactive. `data-hydrated`
 * comes from a root effect, while a control gated on `useHydrated()`
 * is enabled by a later `useSyncExternalStore` commit — measured at
 * about two frames behind. A test that acts the instant this resolves
 * races that gap; wait on the control's own state instead. See
 * `docs/research/0007-a11y-scan-hydration-race.md`.
 */
export async function waitForHydration(page: Page): Promise<void> {
  await page.locator('body[data-hydrated]').waitFor();
}
