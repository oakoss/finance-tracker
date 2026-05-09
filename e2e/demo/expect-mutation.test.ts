import { expect, type Page, test } from '@playwright/test';

import { expectMutation } from '~e2e/fixtures/expect-mutation';

const triggerFakeServerFn = (page: Page) =>
  page.evaluate(() =>
    fetch('/_serverFn/dummy', { body: '{}', method: 'POST' }),
  );

test.describe('expectMutation', { tag: ['@demo'] }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('rejects when the matched server fn returns 5xx', async ({ page }) => {
    await page.route('**/_serverFn/**', (route) =>
      route.fulfill({
        body: '{}',
        contentType: 'application/json',
        status: 500,
      }),
    );

    await expect(
      expectMutation(page, async () => {
        await triggerFakeServerFn(page);
      }),
    ).rejects.toThrow(/2xx, got 500/);
  });

  test('returns the parsed body on 2xx', async ({ page }) => {
    await page.route('**/_serverFn/**', (route) =>
      route.fulfill({
        body: '{"id":"abc"}',
        contentType: 'application/json',
        status: 200,
      }),
    );

    const { body } = await expectMutation<{ id: string }>(page, async () => {
      await triggerFakeServerFn(page);
    });

    expect(body.id).toBe('abc');
  });

  test('default matcher ignores GET server fns (route-loader race)', async ({
    page,
  }) => {
    let mutationStatus = 200;
    await page.route('**/_serverFn/**', (route) => {
      const status = route.request().method() === 'GET' ? 200 : mutationStatus;
      const body =
        route.request().method() === 'GET' ? '{"loader":true}' : '{}';
      return route.fulfill({ body, contentType: 'application/json', status });
    });

    mutationStatus = 500;

    await expect(
      expectMutation(page, async () => {
        await page.evaluate(() => {
          void fetch('/_serverFn/loader', { method: 'GET' });
          return fetch('/_serverFn/mutation', { body: '{}', method: 'POST' });
        });
      }),
    ).rejects.toThrow(/2xx, got 500/);
  });
});
