# E2E Testing

E2E tests use [Playwright](https://playwright.dev/) with Chromium
(desktop + iPhone + Pixel viewports; Firefox/WebKit projects planned).

## Commands

```bash
pnpm test:e2e                              # run all E2E tests headless
pnpm test:e2e:ui                           # open Playwright UI mode for debugging
pnpm test:e2e -- e2e/auth/                 # run a specific directory
pnpm test:e2e -- e2e/auth/sign-in.test.ts  # run a specific file
pnpm test:e2e -- -g "creates account"      # filter by test title substring
pnpm test:e2e -- --grep @smoke             # filter by tag
pnpm test:e2e -- --last-failed             # rerun only previously failed tests
pnpm test:e2e -- --headed                  # run with visible browser (one-off)
npx playwright show-report                 # open the HTML report viewer
```

## Configuration

- **Config**: `playwright.config.ts`
- **Test directory**: `e2e/`
- **TypeScript**: `e2e/tsconfig.json` (separate from root, `strict`
  mode, no `noUnusedLocals`/`noUnusedParameters`)
- **Parallel**: `fullyParallel: true` globally; individual tests run
  in parallel, not just files
- **Browser**: Chromium desktop + iPhone 15 Pro Max + Pixel 7
  (mobile viewports only run `@mobile`-tagged tests)
- **Server**: `pnpm build && pnpm start` on port 3001 (avoids
  colliding with dev on 3000). Reuses existing server locally
- **Retries**: 2 in CI, 0 locally
- **Timeouts**: 30s test, 10s action, 15s navigation, 10s assertion.
  Override `actionTimeout` per-test or per-describe with
  `test.use({ actionTimeout: 20_000 })` for known-slow interactions
  (e.g., file import flows)
- **`testIdAttribute`**: Playwright defaults to `data-testid` (not
  set in our config). Override globally with
  `use: { testIdAttribute: 'data-test' }` if components use a
  different attribute. Affects `getByTestId()`
- **Artifacts**: Screenshots on failure, video retained on failure,
  traces on first retry. Traces include DOM snapshots, action
  timeline, console messages, and network requests. Open with
  `npx playwright show-trace trace.zip`
- **Reporters**: HTML locally; GitHub annotations + blob in CI (no
  HTML in CI)
- **Flaky tests**: `failOnFlakyTests` enabled in CI — retried tests
  that pass on retry still fail the build
- **ESLint**: `eslint-plugin-playwright` with `flat/recommended` rules
  scoped to `e2e/**/*`
- **`forbidOnly`**: enabled in CI — prevents accidentally committed
  `test.only()` from skipping the suite
- **Workers**: 6 locally (`E2E_USER_COUNT`), 2 in CI. Each
  worker uses its own seeded E2E user
- **UI mode caveat**: `pnpm test:e2e:ui` does not run setup projects
  automatically. Run `pnpm test:e2e -- --project=db-setup` first to
  seed worker users, then open UI mode (the worker fixture handles
  auth automatically)
- **Browser management**: `npx playwright install chromium` downloads
  the browser binary. Use `--with-deps` to also install OS-level
  system dependencies in CI. Use `--only-shell` in CI for a smaller
  headless-only binary. CI caches `~/.cache/ms-playwright` (keyed on
  lockfile). Set `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` to skip
  download during `pnpm install` when managing browsers separately.
  Set `PLAYWRIGHT_BROWSERS_PATH` to override the cache location.
  **CI caching note:** The Playwright team recommends against caching
  browser binaries — cache restoration time is comparable to fresh
  download time, especially when OS-level deps are also needed
- **Headed mode on Linux CI**: Running with `headless: false` on
  Linux (including CI containers) requires `xvfb-run`. The
  Playwright Docker image and GitHub Actions runners have Xvfb
  pre-installed, but bare Linux agents do not:
  `xvfb-run pnpm test:e2e -- --headed`
- **Video recording**: `use.video` in config controls recording.
  Values: `'off'` (default), `'on'`, `'retain-on-failure'` (our
  CI setting), `'on-first-retry'`. Access the video path with
  `page.video()?.path()` — but the file is only finalized after
  the browser context closes, so save/assert after `context.close()`.
  Configure resolution with `use.video: { mode: 'on', size: { width: 1280, height: 720 } }`
- **Floating promises**: `@typescript-eslint/no-floating-promises` is
  enabled globally (including `e2e/`). All Playwright calls (`click`,
  `fill`, `goto`, etc.) return Promises and must be `await`-ed

## Tags

| Tag              | Purpose                 | Where it runs                          |
| ---------------- | ----------------------- | -------------------------------------- |
| `@authenticated` | Needs logged-in session | `chromium:authenticated` project       |
| `@mobile`        | Run on mobile viewports | `iphone` + `pixel` projects            |
| `@smoke`         | Core happy paths        | PR CI gate (`--grep @smoke`)           |
| `@stress`        | Perf/load tests         | Local only (`--project stress`)        |
| `@demo`          | Component demo pages    | Local only (`--project chromium:demo`) |
| `@a11y`          | Accessibility scans     | Local only (`--grep @a11y`)            |

### CI tiers

- **PR**: `@smoke` on desktop only (fast gate)
- **Merge to main**: full suite on desktop + mobile (no stress/demo)

### When to add each tag

- `@authenticated` — test imports from `~e2e/fixtures/auth`
- `@mobile` — test validates responsive layout, dialogs, or
  navigation on small screens
- `@smoke` — test covers a core user flow (sign-in, CRUD, import)
- `@a11y` — test runs axe-core or checks keyboard navigation

## Directory structure

```text
e2e/
  setup/
    db.setup.ts              # seeds worker users + catalog (no browser)
  fixtures/
    a11y.ts                  # a11yScan() helper (axe-core WCAG scan)
    auth.ts                  # worker-scoped auth fixture (per-worker login)
    combobox.ts              # combobox interaction helpers
    constants.ts             # shared E2E credentials + worker helpers
    entity.ts                # entity creation helpers
    field.ts                 # form field helpers
    index.ts                 # waitForHydration helper (body[data-hydrated])
    mailpit.ts               # email assertion helpers
    table-actions.ts         # table row action + toast helpers
  app/
    a11y.test.ts             # @a11y
    accounts.test.ts         # @smoke @authenticated @mobile
    budgets.test.ts          # @authenticated
    categories.test.ts       # @smoke @authenticated
    dashboard.test.ts        # @smoke @authenticated @mobile + @a11y @authenticated
    imports.test.ts          # @smoke @authenticated @mobile
    imports-stress.test.ts   # @stress @authenticated
    shell.test.ts            # @smoke
    transactions.test.ts     # @smoke @authenticated
  auth/
    redirect.test.ts         # @smoke
    reverse-guard.test.ts    # @smoke @authenticated
    sign-in.test.ts          # @smoke @a11y @mobile
    sign-up.test.ts          # @smoke @a11y
    sign-out.test.ts         # (no tags)
  demo/
    components.test.ts       # @demo (local only)
  .auth/                     # gitignored (per-worker auth state files)
```

Feature folders correspond to `src/modules/`, plus `app/` for
shell-level and cross-cutting tests, and `demo/` for component
screenshot tests. Tags are applied per `test.describe`, not per
file.

### Tag filtering examples

```bash
pnpm test:e2e:smoke                              # smoke tests, desktop only
pnpm test:e2e:a11y                               # accessibility scans
pnpm test:e2e:stress                             # perf/load tests
pnpm test:e2e:demo                               # component demo pages
pnpm test:e2e -- --grep "@smoke|@a11y"           # OR — either tag
pnpm test:e2e -- --grep "(?=.*@smoke)(?=.*@a11y)" # AND — both tags
```

**Describe-level annotations** — apply custom metadata to an
entire describe block (appears in the HTML report):

```ts
test.describe(
  'accounts CRUD',
  {
    tag: '@crud',
    annotation: {
      type: 'issue',
      description: 'https://github.com/org/repo/issues/42',
    },
  },
  () => {
    // ...
  },
);
```

Annotation types prefixed with `_` (e.g., `_internal`) are hidden
from the HTML reporter — useful for internal tracking metadata.

## Writing tests

Tests live in `e2e/` and use Playwright's test runner (not Vitest).
Authenticated tests import `test`/`expect` from `~e2e/fixtures/auth`
(worker-scoped auth fixture). Public tests import from
`@playwright/test` directly.

**Test isolation:** Each test runs in its own `BrowserContext` — an
isolated incognito-equivalent with separate cookies, localStorage,
and session storage. Tests must not depend on execution order or
share mutable state. Playwright uses a "start from scratch" model,
so no cleanup between tests is needed.

**Avoid third-party dependencies:** Mock external API calls with
`page.route()` or `context.route()` instead of hitting live
services. This prevents flaky tests from uncontrollable external
dependencies (e.g., OAuth providers, currency APIs):

```ts
await page.route('**/api.exchangerate.host/**', (route) =>
  route.fulfill({ json: { rates: { EUR: 0.85 } } }),
);
```

**Navigation:** `page.goto()` waits for the `load` event
(including stylesheets, scripts, iframes) and follows server
redirects automatically. For SPA navigations triggered by clicks,
use `page.waitForURL()`:

```ts
await page.getByRole('link', { name: 'Dashboard' }).click();
await page.waitForURL('/dashboard');
```

**Hydration:** SSR renders HTML before React attaches event
handlers. Auth form submit buttons and page header "Add" buttons
use `disabled={!hydrated}` via the `useHydrated()` hook. This
fixes the real UX bug (users on slow connections clicking
unhydrated buttons) AND lets Playwright's actionability auto-wait
handle the timing — `click()` waits for the button to be enabled,
which happens after hydration.

**Hydration gate for form fills:** `fill()` on controlled React
inputs before hydration is silently lost — React's hydration pass
resets the DOM value to the server-rendered default. Use
`toBeEnabled()` on the disabled submit button as a native
hydration gate before filling:

```ts
await page.goto('/sign-in');
// Hydration gate — button is disabled until useHydrated() returns true
await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
// Safe to fill — React event handlers are attached
await page.getByLabel('Email').fill(email);
```

**When to use `waitForHydration(page)`:** Only for operations
that bypass Playwright's actionability checks:

- `dispatchEvent('click')` — fires events directly, ignores
  disabled state
- `BroadcastChannel` listeners — need `useEffect` to register
- `a11yScan(page)` — axe-core scans the DOM directly

Most tests need no explicit hydration wait.

**New page-level interactive controls:** Auth form submit buttons
and page header buttons (e.g., "Add Account") must use
`disabled={!hydrated}` via `useHydrated()` from
`@/hooks/use-hydrated`. Dialog buttons don't need this — they
only render after user interaction (which requires hydration).
Forgetting this on page-level buttons causes flaky E2E tests
and a UX bug on slow connections.

**Toast cleanup between setup and test:** Sonner toasts are global
React state that persists across client-side navigations and takes
several seconds to auto-dismiss. A toast triggered during
`beforeEach` setup (e.g., account creation) can still be visible
when the test body runs, causing visibility assertions to fail or
intercepting clicks on mobile viewports.

Add cleanup in `beforeEach` to remove lingering toast DOM nodes
_before_ the test navigates to its target page:

```ts
test.beforeEach(async ({ page }) => {
  // ... setup that triggers toasts ...

  // Remove toast DOM before navigating (safe because goto resets Sonner)
  await page.evaluate(() => {
    for (const el of document.querySelectorAll(
      'section[aria-label*="Notification"] > *',
    )) {
      el.remove();
    }
  });
});
```

DOM removal is only safe when followed by a full page navigation
(`page.goto()`), which resets Sonner's internal React state. **Do
not use DOM removal mid-test** — Sonner still tracks the toast
internally and subsequent toasts may fail to render. To wait for a
toast to clear mid-test, use `toBeHidden()` with a generous
timeout:

```ts
await expect(page.getByText('Toast message')).toBeHidden({ timeout: 10_000 });
```

**Mocking browser APIs:** Use `addInitScript()` to override native
APIs before the page loads (must be called before `goto()`):

```ts
await page.addInitScript(() => {
  Object.defineProperty(navigator, 'language', { value: 'de-DE' });
});
await page.goto('/dashboard');
```

**Scaffolding with codegen:** Use `npx playwright codegen <url>`
to record browser interactions and generate test boilerplate.
Clean up the generated selectors to follow the locator strategy
before committing.

Codegen options:

- `--load-storage=playwright/.auth/user.json` — start with an
  authenticated session
- `--save-storage=state.json` — save session state after recording
- `--device="iPhone 15 Pro Max"` — emulate a device
- `--viewport-size="375,812"` — set viewport dimensions
- `--color-scheme=dark` — emulate dark mode
- `--timezone="America/New_York"` — set timezone

The codegen UI includes an "Assert" button to record assertions
(visibility, text, value) alongside actions. Review generated
assertions and tighten them (e.g., add `exact: true`).

**Mid-test recording:** Insert `await page.pause()` in a test to
open the Inspector, then use "Record" to generate code from that
point. Use this to extend an existing test interactively.

**VS Code extension:** The Playwright VS Code extension provides
"Record at Cursor" (inserts actions at the cursor position) and
"Pick Locator" (highlights elements and copies the best locator).

```ts
// Authenticated test — uses worker-scoped auth fixture
import { expect, test } from '~e2e/fixtures/auth';

test.describe('feature', { tag: '@authenticated' }, () => {
  test('example', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
  });
});
```

```ts
// Public test — no auth needed
import { expect, test } from '@playwright/test';

test('example', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Sign in' }).click();
});
```

**Skipping and marking known-broken tests:**

```ts
// Conditionally skip (e.g., platform-specific)
test('drag and drop', async ({ page, browserName }) => {
  test.skip(browserName === 'firefox', 'DnD flaky on Firefox');
  // ...
});

// Mark as known-broken — test is skipped but tracked
test('import large CSV', async ({ page }) => {
  test.fixme(); // TODO: fix after TREK-19 lands
  // ...
});
```

`test.skip()` and `test.fixme()` both skip execution. Use `fixme`
for tests you intend to fix (shows in report as "fixme"), `skip`
for intentional exclusions. Always include a reason or ticket.

```ts
// Expected to fail — runs the test and asserts it DOES fail.
// Useful for documenting known regressions that must not silently pass.
test('negative balance formatting', async ({ page }) => {
  test.fail(); // Known bug: TREK-XX — remove when fixed
  // ...
});

// Triple the timeout for a single slow test
test('import large CSV', async ({ page }) => {
  test.slow(); // CSV parsing takes ~30s with 10k rows
  // ...
});
```

`test.fail()` is distinct from `fixme` — it actually runs the
test and fails if it unexpectedly passes. `test.slow()` triples
the test timeout without changing global config.

**Conditional skip in `beforeEach`:**

```ts
test.beforeEach(async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name === 'chromium:public',
    'These tests require authentication',
  );
});
```

Tag test groups for filtering (e.g., `--grep @smoke`):

```ts
test.describe('feature', { tag: '@smoke' }, () => {
  test('loads', async ({ page }) => {
    // ...
  });
});
```

## Structured steps with `test.step()`

`test.step()` breaks tests into named phases. Steps appear as
collapsible sections in Playwright's HTML report, so failures are
quick to locate:

```ts
test('user creates a new account', async ({ page }) => {
  await test.step('navigate to accounts page', async () => {
    await page.goto('/accounts');
    await expect(page.getByRole('heading', { name: 'Accounts' })).toBeVisible();
  });

  await test.step('open create dialog', async () => {
    await page.getByRole('button', { name: 'Add Account' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  await test.step('fill account details and submit', async () => {
    await page.getByLabel('Account Name').fill('Chase Sapphire');
    await page.getByRole('button', { name: 'Create' }).click();
  });

  await test.step('verify account appears in list', async () => {
    await expect(page.getByText('Chase Sapphire')).toBeVisible();
  });
});
```

Steps can be nested. Prefer 3-5 steps per test for readability.

## What needs E2E testing

These areas require a running app, database, or browser. They are
excluded from unit test coverage:

- **Auth flows**: sign-up, sign-in, OAuth redirects, session
  handling, email verification (`src/lib/auth.ts`,
  `src/lib/auth-client.ts`).
- **Email sending**: Brevo integration, template rendering
  (`src/lib/email.ts`, `src/modules/auth/emails/*`).
- **Database operations**: Drizzle queries, migrations
  (`src/db/*`, `src/modules/*/queries/*`).
- **Route rendering**: TanStack Router pages, loaders, server
  functions (`src/routes/**`).
- **Nitro plugins**: evlog drain, server lifecycle
  (`src/lib/logging/drain.ts`).
- **File uploads**: `src/hooks/use-file-upload.ts` (browser APIs +
  server endpoint).
- **Components**: interactive behavior requiring DOM events and
  state (`src/components/**`).

## Per-feature test expectations

Every feature should include at minimum:

| Layer                 | What                                         | When                                    |
| --------------------- | -------------------------------------------- | --------------------------------------- |
| Server function tests | Validate inputs, business logic, error cases | TDD — write before implementation       |
| Unit tests            | Complex hooks, validators, formatters        | Write alongside or after implementation |
| E2E test              | Happy-path user flow with `test.step()`      | Write after feature is functional       |

**TDD for server functions**: Write the test first, then implement
the server function to pass it. The API contract is defined before
the implementation.

**Test-after for UI**: Components and pages are tested via E2E
after the feature works. Unit-test complex client logic (hooks,
validators) but skip unit tests for simple rendering.

## Debugging

See [debugging.md](debugging.md) for full details. Quick reference:

```bash
pnpm test:e2e -- --debug                   # Playwright Inspector
pnpm test:e2e -- --headed e2e/auth/*.ts    # visible browser
DEBUG=pw:api pnpm test:e2e -- e2e/auth/*.ts # verbose API logs
npx playwright show-trace trace.zip        # Trace Viewer
npx playwright show-report                 # HTML report
```

## CI

- **PR gate** (`e2e-smoke`): runs `@smoke` tests on
  `chromium:authenticated` + `chromium:public` only. Fast
  feedback on core flows.
- **Merge to main** (`e2e-full`): runs full suite on
  `chromium:authenticated` + `chromium:public` + `iphone` +
  `pixel`. Catches regressions before they hit main.
- **Production build**: CI builds then serves the production
  bundle to test against the real build.
- **Workers**: CI uses 2 workers; locally uses 6
  (`E2E_USER_COUNT`).
- **Demo/stress**: excluded from CI. Run locally with
  `pnpm test:e2e:demo` or `pnpm test:e2e:stress`.

## Future considerations

- Secrets for authenticated tests via varlock secret manager plugins
  (e.g. 1Password, AWS Secrets Manager).
- Firefox/WebKit projects for cross-browser coverage.
- `webServer.wait` to detect server readiness by stdout pattern
  instead of port polling.
- Deployment-triggered testing via GitHub Actions
  `deployment_status` event with `PLAYWRIGHT_TEST_BASE_URL` env var
  pointing at the preview/staging URL.

## Topic files

| Topic         | File                                 |
| ------------- | ------------------------------------ |
| Locators      | [locators.md](locators.md)           |
| Assertions    | [assertions.md](assertions.md)       |
| Auth          | [auth.md](auth.md)                   |
| Network       | [network.md](network.md)             |
| Accessibility | [accessibility.md](accessibility.md) |
| Fixtures      | [fixtures.md](fixtures.md)           |
| Config        | [config.md](config.md)               |
| Debugging     | [debugging.md](debugging.md)         |
