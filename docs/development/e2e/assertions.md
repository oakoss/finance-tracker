# Assertions

[Back to E2E Testing](README.md)

## Assertions

Playwright has two assertion categories. The 10-second assertion
timeout (configured in `playwright.config.ts`) applies only to
auto-retrying assertions. Non-retrying assertions are synchronous
and have no timeout.

### Auto-retrying (async, must `await`)

These retry until the condition is met or the assertion timeout
expires:

```ts
await expect(page.getByRole('alert')).toBeVisible();
await expect(page).toHaveURL(/dashboard/);
await expect(page.getByLabel('Email')).toHaveValue('user@test.com');
```

Any auto-retrying assertion can be negated with `.not`:

```ts
await expect(page.getByRole('alert')).not.toBeVisible();
await expect(page).not.toHaveURL(/sign-in/);
```

Common auto-retrying assertions:

| Assertion                          | What it checks                         |
| ---------------------------------- | -------------------------------------- |
| `toBeVisible()` / `toBeHidden()`   | Element visibility                     |
| `toBeEnabled()` / `toBeDisabled()` | Form control state                     |
| `toBeChecked()`                    | Checkbox/radio state                   |
| `toBeEditable()`                   | Enabled and not readonly               |
| `toBeFocused()`                    | Element has focus                      |
| `toBeEmpty()`                      | No children or empty input value       |
| `toBeAttached()`                   | Element is in the DOM (even if hidden) |
| `toBeInViewport()`                 | Element is in the visible viewport     |
| `toHaveText()` / `toContainText()` | Text content (exact or partial)        |
| `toHaveValue()` / `toHaveValues()` | Input values                           |
| `toHaveURL()`                      | Page URL (string, regex, predicate)    |
| `toHaveTitle()`                    | Page title                             |
| `toHaveAttribute()`                | HTML attribute value                   |
| `toHaveClass()`                    | CSS class names (string, regex, array) |
| `toHaveCSS()`                      | Computed CSS property value            |
| `toHaveCount()`                    | Number of matching elements            |
| `toHaveAccessibleName()`           | Accessible name via ARIA               |
| `toHaveAccessibleDescription()`    | `aria-describedby` / `title` content   |
| `toHaveRole()`                     | ARIA role                              |
| `toHaveScreenshot()`               | Visual screenshot diff                 |

**API response assertion:**

```ts
const response = await request.get('/api/accounts');
await expect(response).toBeOK(); // asserts 2xx status (more robust than toBe(200))
```

### Non-retrying (synchronous)

Standard value assertions with no retry. These are the same
matchers from Jest/Vitest:

```ts
expect(someValue).toBe(true);
expect(items).toHaveLength(3);
expect(response.status()).toBe(200);
```

Common non-retrying matchers: `toBe()`, `toEqual()`,
`toHaveLength()`, `toContain()`, `toMatch()`, `toBeTruthy()`,
`toBeFalsy()`, `toBeDefined()`, `toBeUndefined()`, `toBeNull()`,
`toBeGreaterThan()`, `toBeGreaterThanOrEqual()`, `toBeLessThan()`,
`toBeLessThanOrEqual()`, `toBeCloseTo()` (floating-point),
`toBeNaN()`, `toBeInstanceOf()`, `toMatchObject()`.

**Asymmetric matchers** for flexible shape assertions (especially
useful for API responses where exact values are unknown):

```ts
const accounts = await response.json();

// Assert shape without knowing exact values
expect(accounts[0]).toMatchObject({
  id: expect.any(String),
  name: expect.stringContaining('Checking'),
  balance: expect.any(Number),
});

// Assert array contains a specific item regardless of order
expect(accounts).toEqual(
  expect.arrayContaining([expect.objectContaining({ name: 'Savings' })]),
);
```

Available matchers: `expect.any(Constructor)`,
`expect.anything()` (any value except `null`/`undefined`),
`expect.arrayContaining()`, `expect.objectContaining()`,
`expect.stringContaining()`, `expect.stringMatching()`,
`expect.closeTo()`.

### Soft assertions

Soft assertions don't stop the test on failure. All failures are
reported at the end:

```ts
await expect.soft(page.getByText('Total')).toBeVisible();
await expect.soft(page.getByText('$100')).toBeVisible();
// Test continues; both failures reported at end
```

Use soft assertions for multiple independent checks in a single
test (e.g., verifying all fields on a form). Prefer hard assertions
for sequential flow where a failure makes later steps meaningless.

Create a bulk-soft expect to avoid repeating `expect.soft()`:

```ts
const softExpect = expect.configure({ soft: true });
await softExpect(page.getByText('Total')).toBeVisible();
await softExpect(page.getByText('$0.00')).toBeVisible();
```

### Custom error messages

```ts
await expect(
  page.getByRole('alert'),
  'Error banner should appear after invalid login',
).toBeVisible();
```

### Custom timeouts with `expect.configure()`

Create a pre-configured `expect` for assertions that need longer
timeouts (e.g., waiting for background jobs):

```ts
const slowExpect = expect.configure({ timeout: 15_000 });
await slowExpect(page.getByText('Processing complete')).toBeVisible();
```

`expect.configure()` can also be used in `playwright.config.ts` to
set project-wide assertion defaults (timeout, soft mode). The
per-test `expect.configure()` creates a local instance that
overrides the global config.

### Test annotations

Attach lightweight structured metadata to tests at runtime
(lighter than `testInfo.attach()` which is for binary data):

```ts
test('dashboard loads', async ({ page }, testInfo) => {
  // Link a known issue
  testInfo.annotations.push({
    description: 'https://github.com/org/repo/issues/123',
    type: 'issue',
  });

  // Mark as slow with a reason
  testInfo.annotations.push({
    description: 'Dashboard queries 5 tables',
    type: 'slow',
  });
});
```

Annotations appear in the HTML report alongside test results.

### Custom matchers with `expect.extend()`

Define new matchers from scratch (distinct from `mergeExpects()`
which combines existing ones):

```ts
import { expect as baseExpect } from '@playwright/test';

export const expect = baseExpect.extend({
  async toHaveAmount(locator, expected: string) {
    const text = await locator.textContent();
    const pass = text?.includes(expected) ?? false;
    return {
      message: () => `expected ${text} to contain amount ${expected}`,
      name: 'toHaveAmount',
      pass,
    };
  },
});
```

### Polling for non-UI values

`expect.poll()` defaults to the assertion timeout (10s). Always
specify an explicit `timeout` for operations that may take longer:

```ts
await expect
  .poll(
    async () => {
      const response = await page.request.get('/api/status');
      return response.status();
    },
    { timeout: 10_000 },
  )
  .toBe(200);
```

### Retry blocks with `toPass()`

Retry an entire block of assertions until they all pass. Use this
when multiple conditions must be true together but the state is
still settling.

**Important:** `toPass()` has a default timeout of **0** (retries
forever). Always specify an explicit `timeout` to avoid hanging CI:

```ts
await expect(async () => {
  const response = await page.request.get('/api/accounts');
  const accounts = await response.json();
  expect(accounts).toHaveLength(1);
  expect(accounts[0].name).toBe('Checking');
}).toPass({ timeout: 10_000 });
```

### Polling intervals

`expect.poll()` accepts an `intervals` option to control polling
frequency (default: `[100, 250, 500, 1000]` ms). Use longer
intervals for slow background jobs:

```ts
await expect
  .poll(
    async () => {
      const r = await page.request.get('/api/import/status');
      return (await r.json()).status;
    },
    { intervals: [500, 1_000, 2_000], timeout: 30_000 },
  )
  .toBe('done');
```

### Custom matchers with `mergeExpects()`

Split custom matchers across fixture files and merge them into a
single `expect`:

```ts
import { mergeExpects } from '@playwright/test';
import { currencyExpect } from '~e2e/fixtures/currency-matchers';
import { formExpect } from '~e2e/fixtures/form-matchers';

export const expect = mergeExpects(currencyExpect, formExpect);
```

## ARIA snapshots

`toMatchAriaSnapshot()` validates the accessibility tree structure
of a page or component using a YAML-like template. This catches
ARIA regressions (missing roles, broken labels, wrong hierarchy)
that visual snapshots miss.

```ts
await expect(page.getByRole('navigation')).toMatchAriaSnapshot(`
  - navigation:
    - link "Dashboard"
    - link "Accounts"
    - link "Transactions"
`);
```

**Matching modes:**

- Partial match (default) — extra elements are allowed; only the
  listed items must be present in the correct order.
- Regex — use `/pattern/` for dynamic text:
  `- heading /Welcome, .+/`
- `toMatchAriaSnapshot({ fullMatch: true })` — requires the tree
  to match exactly with no extra elements.

**Generating baselines:**

```bash
# Auto-generate snapshot files for tests that use toMatchAriaSnapshot
pnpm test:e2e -- --update-snapshots
```

Snapshot files are stored alongside tests in `*.aria.yml` files
when using the external snapshot form. Inline templates (as above)
are updated in-place.

## Visual regression

`toHaveScreenshot()` captures a screenshot, compares it against a
stored baseline, and fails if the diff exceeds the threshold.
Distinct from `page.screenshot()`, which just saves a PNG file.

```ts
// Full page screenshot comparison
await expect(page).toHaveScreenshot('dashboard.png');

// Element-level screenshot comparison
await expect(page.getByRole('table')).toHaveScreenshot('accounts-table.png');
```

**Baseline workflow:**

1. First run: no baseline exists — test fails and generates the
   expected image in the test snapshots directory.
2. Review the generated image and commit it.
3. Subsequent runs compare against the committed baseline.

**Updating baselines:**

```bash
# Regenerate all screenshot baselines
pnpm test:e2e -- --update-snapshots
```

**Diff tolerance** — prevent flaky failures from anti-aliasing
and font rendering differences:

```ts
await expect(page).toHaveScreenshot('dashboard.png', {
  maxDiffPixels: 100, // allow up to 100 differing pixels
  // OR
  maxDiffPixelRatio: 0.01, // allow 1% of total pixels to differ
  threshold: 0.2, // per-pixel color difference tolerance (0-1)
});
```

**Masking dynamic content** — hide timestamps, avatars, and other
non-deterministic elements:

```ts
await expect(page).toHaveScreenshot('dashboard.png', {
  mask: [page.getByTestId('timestamp'), page.locator('.avatar')],
});
```

**Injecting stable styles** — use `stylePath` to inject CSS that
disables animations, hides blinking cursors, etc.:

```ts
await expect(page).toHaveScreenshot('form.png', {
  stylePath: 'e2e/screenshot-stabilize.css',
});
```

```css
/* e2e/screenshot-stabilize.css */
*,
*::before,
*::after {
  animation-duration: 0s !important;
  transition-duration: 0s !important;
  caret-color: transparent !important;
}
```

**Environment consistency:** Screenshot baselines are
OS/browser-specific. Generated on macOS will differ from Linux CI.
Either generate baselines in CI (recommended) or use per-platform
snapshot directories via `snapshotPathTemplate` in config.

**`page.screenshot()` API** — for saving debug screenshots (not
comparison):

```ts
await page.screenshot({ path: 'debug.png', fullPage: true });

// Clip to a specific region
await page.screenshot({
  clip: { x: 0, y: 0, width: 800, height: 600 },
  path: 'header.png',
});
```
