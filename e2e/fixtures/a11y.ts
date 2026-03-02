import type { Page } from '@playwright/test';

import AxeBuilder from '@axe-core/playwright';

/** Run an axe-core scan with our standard WCAG tag set. */
export function a11yScan(page: Page) {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
}
