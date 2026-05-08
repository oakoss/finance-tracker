import type { Page } from '@playwright/test';

import { expect, test } from '~e2e/fixtures/clock';
import { FROZEN_E2E_TIME, isoUtcInstant } from '~e2e/fixtures/constants';

const probeNow = async (page: Page) =>
  page.evaluate(() => ({
    now: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }));

test.describe('clock fixture', { tag: ['@demo'] }, () => {
  test('freezes Date to FROZEN_E2E_TIME and pins timezone to UTC', async ({
    page,
  }) => {
    await page.goto('/components/layout');

    const probe = await probeNow(page);

    expect(probe.now).toBe(FROZEN_E2E_TIME);
    expect(probe.timezone).toBe('UTC');
  });

  test.describe('with overridden clockTime', () => {
    const OVERRIDE = isoUtcInstant('2026-12-25T09:00:00.000Z');
    test.use({ clockTime: OVERRIDE });

    test('test.use({ clockTime }) takes effect', async ({ page }) => {
      await page.goto('/components/layout');

      const probe = await probeNow(page);

      expect(probe.now).toBe(OVERRIDE);
    });
  });
});
