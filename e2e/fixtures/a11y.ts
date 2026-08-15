import type { Page } from '@playwright/test';

import AxeBuilder from '@axe-core/playwright';

/** Consecutive unchanged frames required before the page counts as settled. */
const STABLE_FRAMES = 3;

/** Longest we wait for that; on timeout we scan anyway rather than fail here. */
const SETTLE_TIMEOUT_MS = 2000;

/**
 * Run an axe-core scan with our standard WCAG tag set.
 *
 * Waits for interactive controls to stop changing first. `waitForHydration()`
 * resolves on a root effect, but a control gated on `useHydrated()` is only
 * enabled in a later commit, so for about a frame it carries the faded
 * `disabled` styling without the `disabled` attribute. axe exempts inactive
 * controls from contrast yet computes contrast from opacity-adjusted colors,
 * so a scan landing in that frame reads a half-opacity button as active and
 * fails it at 2.29:1.
 *
 * Stability is measured rather than asserted as a condition: a control that is
 * still faded *and* disabled looks fine to any point-in-time check, so such a
 * check passes during hydration and leaves the race intact. Waiting for
 * several consecutive unchanged snapshots spans that flip instead. A
 * legitimately disabled control is stable from the start, so it settles in
 * those few frames rather than waiting out the timeout.
 *
 * Waiting on `getAnimations()` — the usual remedy — does not help: under
 * `prefers-reduced-motion` the transition is effectively instant, and the frame
 * still occurs with opacity transitions removed entirely.
 */
export async function a11yScan(page: Page) {
  await page.evaluate(() => {
    // Scan bookkeeping lives on the page global, which globalThis is not typed for.
    // oxlint-disable-next-line type-evidence/no-chained-type-assertions
    delete (globalThis as unknown as Record<string, unknown>).__a11ySettle;
  });

  await page
    .waitForFunction(
      (stableFrames) => {
        // Scan bookkeeping lives on the page global, which globalThis is not typed for.
        // oxlint-disable-next-line type-evidence/no-chained-type-assertions
        const store = globalThis as unknown as {
          __a11ySettle?: { prev: string; stable: number };
        };
        const snapshot = [
          ...document.querySelectorAll('button, a, input, select, textarea'),
        ]
          .map(
            (el) =>
              `${el.hasAttribute('disabled')}:${el.getAttribute('aria-disabled')}:${getComputedStyle(el).opacity}`,
          )
          .join('|');
        const state = (store.__a11ySettle ??= { prev: '', stable: 0 });
        state.stable = snapshot === state.prev ? state.stable + 1 : 0;
        state.prev = snapshot;
        return state.stable >= stableFrames;
      },
      STABLE_FRAMES,
      { polling: 'raf', timeout: SETTLE_TIMEOUT_MS },
    )
    .catch(() => {
      // Still churning after the deadline — scan and let axe report what it sees.
    });

  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
}
