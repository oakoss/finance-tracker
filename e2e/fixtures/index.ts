import type { Locator, Page } from '@playwright/test';

/**
 * Wait for React hydration on an SSR page. TanStack Start renders
 * HTML server-side but form event handlers only attach after React
 * hydrates. Interacting before hydration causes native form submits.
 *
 * WARNING: Hangs until Playwright's test timeout if the page has no
 * `<form>` element. Use {@link waitForElementHydration} for pages
 * without forms.
 *
 * @param page - Playwright page instance.
 * @param timeout - Maximum wait in milliseconds (default: 10 000).
 */
export async function waitForHydration(
  page: Page,
  timeout = 10_000,
): Promise<void> {
  await page
    .waitForFunction(
      () => {
        const form = document.querySelector('form');
        return (
          form && Object.keys(form).some((k) => k.startsWith('__reactFiber'))
        );
      },
      undefined,
      { timeout },
    )
    .catch(() => {
      throw new Error(
        'waitForHydration: timed out waiting for a hydrated <form> element. ' +
          'Ensure the page contains a <form> and React has finished hydrating.',
      );
    });
}

/**
 * Wait for React hydration on a specific element. Use this on pages
 * without a `<form>` (e.g. dashboard) where the generic
 * {@link waitForHydration} would hang.
 *
 * @param locator - Playwright locator for the target element.
 * @param timeout - Maximum wait in milliseconds (default: 10 000).
 * @throws {Error} If the element is not hydrated within the timeout.
 */
export async function waitForElementHydration(
  locator: Locator,
  timeout = 10_000,
): Promise<void> {
  await locator.evaluate(
    (el, ms) =>
      new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('Hydration timeout')),
          ms,
        );
        const check = () => {
          if (Object.keys(el).some((k) => k.startsWith('__reactFiber'))) {
            clearTimeout(timer);
            resolve();
          } else {
            requestAnimationFrame(check);
          }
        };
        check();
      }),
    timeout,
  );
}
