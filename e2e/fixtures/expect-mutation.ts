import { expect, type Page, type Response } from '@playwright/test';

type ResponseMatcher = string | RegExp | ((response: Response) => boolean);

const isServerFnMutation = (response: Response) =>
  response.url().includes('/_serverFn/') &&
  response.request().method() !== 'GET';

/**
 * Run an action that triggers a TanStack Start server function and assert
 * the response is 2xx. Without this, an optimistic update that fails
 * server-side still satisfies a UI-only assertion.
 *
 * `matcher` defaults to any non-GET `/_serverFn/` request — POST mutations
 * only, so route-loader GETs fired by `router.invalidate()` don't win the
 * race. Pass a substring, regex, or predicate to pin to a specific
 * server function.
 */
export async function expectMutation<TBody = unknown>(
  page: Page,
  action: () => Promise<void>,
  options: {
    body?: (body: TBody) => Promise<void> | void;
    matcher?: ResponseMatcher;
  } = {},
): Promise<{ body: TBody; response: Response }> {
  const { body: assertBody, matcher = isServerFnMutation } = options;
  const responsePromise = page.waitForResponse((response) => {
    if (typeof matcher === 'string') return response.url().includes(matcher);
    if (matcher instanceof RegExp) return matcher.test(response.url());
    return matcher(response);
  });

  await action();
  const response = await responsePromise;

  expect(
    response.ok(),
    `Expected ${response.url()} to return 2xx, got ${response.status()}`,
  ).toBe(true);

  const body = (await response.json()) as TBody;
  await assertBody?.(body);

  return { body, response };
}
