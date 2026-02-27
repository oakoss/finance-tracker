# Accessibility Testing

[Back to E2E Testing](README.md)

## Accessibility testing

Accessibility tests use `@axe-core/playwright` to scan pages for
WCAG violations. Install: `pnpm add -D @axe-core/playwright`.

**Basic pattern:**

```ts
import AxeBuilder from '@axe-core/playwright';

test('page has no a11y violations', async ({ page }) => {
  await page.goto('/sign-in');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

**Scanning after interactions:**

Scan the page after revealing hidden UI (dropdowns, modals,
flyouts). Use `waitFor()` before `analyze()` to ensure the
element is in the DOM:

```ts
await page.getByRole('button', { name: 'Menu' }).click();
await page.locator('#menu-flyout').waitFor();

const results = await new AxeBuilder({ page })
  .include('#menu-flyout')
  .analyze();
expect(results.violations).toEqual([]);
```

**Scoping scans:**

- `withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])`
  — all WCAG 2.0, 2.1, and 2.2 Level A + AA rules
- `withTags(['wcag2aa'])` — WCAG 2.0 Level AA only
- `withRules(['color-contrast'])` — check specific rules only
- `include('.main-content')` — scan a specific region
- `exclude('.third-party-widget')` — skip known third-party elements.
  **Caveat:** `exclude()` silences ALL rules on the element AND all
  its descendants. For single-rule issues on your own elements,
  prefer `disableRules()` instead
- `disableRules(['color-contrast'])` — skip rules with known issues

**Dark mode testing:**

```ts
test('no contrast violations in dark mode', async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: 'dark' });
  const page = await context.newPage();
  await page.goto('/sign-in');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2aa'])
    .withRules(['color-contrast'])
    .analyze();
  expect(results.violations).toEqual([]);
  await context.close();
});
```

**Shared config via fixture:**

When multiple tests share the same AxeBuilder configuration,
extract a factory fixture. The factory returns a fresh builder
so each test can further customize with `.include()`:

```ts
import AxeBuilder from '@axe-core/playwright';
import { test as base } from '@playwright/test';

type AxeFixture = { makeAxeBuilder: () => AxeBuilder };

const test = base.extend<AxeFixture>({
  makeAxeBuilder: async ({ page }, use) => {
    await use(() =>
      new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .exclude('.third-party-widget'),
    );
  },
});

test('page is accessible', async ({ makeAxeBuilder }) => {
  const results = await makeAxeBuilder().analyze();
  expect(results.violations).toEqual([]);
});

test('dialog is accessible', async ({ page, makeAxeBuilder }) => {
  await page.getByRole('button', { name: 'Open' }).click();
  const results = await makeAxeBuilder().include('[role="dialog"]').analyze();
  expect(results.violations).toEqual([]);
});
```

**Attaching scan results:**

Embed full scan results in the HTML report for debugging failed
a11y tests:

```ts
test('page is accessible', async ({ page }, testInfo) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2aa'])
    .analyze();

  await testInfo.attach('a11y-scan-results', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  expect(results.violations).toEqual([]);
});
```

**Handling known violations:**

Prefer excluding elements or disabling specific rules over
snapshot-based suppression. When a violation is intentional or
third-party, exclude the element and add a comment explaining why.

If you need to track known violations without blocking the test,
use a minimal fingerprint (rule ID + CSS targets). Never snapshot
the full violations object. HTML snippets make it fragile:

```ts
// Anti-pattern — fragile, breaks on any HTML change:
expect(results.violations).toMatchSnapshot();

// Fingerprint approach — stable across HTML changes:
function violationFingerprints(
  results: Awaited<ReturnType<AxeBuilder['analyze']>>,
) {
  return results.violations.map((v) => ({
    rule: v.id,
    targets: v.nodes.map((n) => n.target),
  }));
}
expect(violationFingerprints(results)).toMatchSnapshot();
```

**Limitations:** Automated a11y scans catch ~30-40% of real issues.
They detect contrast, missing labels, ARIA misuse, and heading
hierarchy. They cannot detect keyboard trap issues, focus order
problems, or screen reader comprehension. Complement with manual
testing using [Accessibility Insights for Web](https://accessibilityinsights.io/docs/web/overview/).
