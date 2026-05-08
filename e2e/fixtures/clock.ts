import { test as base } from '@playwright/test';

import { FROZEN_E2E_TIME, type IsoUtcInstant } from '~e2e/fixtures/constants';

type ClockFixtures = {
  /** Z-suffixed ISO UTC instant (via `isoUtcInstant()`) or `Date`. */
  clockTime: Date | IsoUtcInstant;
};

/**
 * Installs and pauses `page.clock` once per test, anchored to `clockTime`
 * (defaults to `FROZEN_E2E_TIME`). The patched clock persists across
 * navigations within the test. See `docs/development/e2e/fixtures.md`
 * for usage and the auth-composition caveat.
 */
export const test = base.extend<ClockFixtures>({
  clockTime: [FROZEN_E2E_TIME, { option: true }],
  page: async ({ clockTime, page }, use) => {
    await page.clock.install({ time: clockTime });
    await page.clock.pauseAt(clockTime);
    await use(page);
  },
});

export { expect } from '@playwright/test';
