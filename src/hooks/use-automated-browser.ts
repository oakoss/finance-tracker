import { useSyncExternalStore } from 'react';

import { emptySubscribe } from '@/lib/utils';

/**
 * Returns `true` when the page is controlled by browser automation.
 *
 * Reads `navigator.webdriver`, which is `true` in most automation
 * environments (Playwright, Selenium, Puppeteer, etc.). Returns
 * `false` on the server and in normal browsers.
 */
function useAutomatedBrowser(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => navigator.webdriver,
    () => false,
  );
}

export { useAutomatedBrowser };
