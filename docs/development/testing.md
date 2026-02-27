# Testing

Testing strategy and commands.

CI policy and automation decisions are defined in
`docs/adr/0011-ci-and-renovate.md`.

## Prerequisites

- Copy `.env.example` to `.env` for local runs (or use 1Password
  Environments).

## Commands

```bash
pnpm test            # run all tests (unit + integration)
pnpm test:unit       # unit tests only (no DB required)
pnpm test:integration # integration tests only (requires Postgres)
pnpm test:watch      # run in watch mode
pnpm test:coverage   # unit coverage report
```

Run a single test file:

```bash
pnpm test -- path/to/file.test.ts
```

Run a single test by name:

```bash
pnpm test -- -t "test name"
```

## Configuration

- **Vitest config**: `vitest.config.ts` (unit tests, separate from
  `vite.config.ts` to avoid loading Nitro/TanStack Start).
- **Vitest projects**: `test.projects` in `vitest.config.ts` (unit +
  integration).
- **Test setup**: `test/setup.ts` (cleanup, jest-dom matchers).
- **Globals**: `describe`, `it`, `expect` are available without imports.
- **Env loading**: dotenvx `flow` convention loads `.env` automatically.

### Why a separate vitest config?

TanStack Start's `vite.config.ts` registers Nitro modules, evlog
plugins, and TanStack Router — none of which should run during unit
tests. A separate `vitest.config.ts` that only includes path aliases and
React keeps tests fast and avoids Nitro side effects.

## Test Factories

Factory functions live in `test/factories/`. Import directly from
module paths (e.g., `~test/factories/user.factory`).

- `createX(overrides?)`: returns a plain object (unit tests, no DB
  needed).
- `insertX(db, overrides?)`: inserts into DB and returns the record
  via `.returning()`.

Always pass the `db` instance as a parameter (never import the
singleton).

Available factories: `User`, `LedgerAccount`, `Category`, `Payee`,
`Tag`, `Transaction`, `Transfer`.

Scenario builders in `test/scenarios/` compose multiple factories:

- `createFullTransaction(db)`: user + account + category + payee +
  transaction
- `createMultiAccountUser(db)`: user with checking, savings, and
  credit card accounts
- `createMonthlySpending(db)`: user + account + 5 categories +
  3 payees + 30 transactions

## Unit tests

Unit tests cover pure functions and utilities that don't require a
running server, database, or browser.

### Coverage scope

Coverage is collected for `src/lib/**`, `src/configs/**`, and
`src/hooks/**`, with exclusions for files that need integration or E2E
testing (auth, email, Nitro plugins). See `vitest.config.ts` for the
full exclude list.

### What to unit test

| File                      | What to test                                                                                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/i18n.ts`         | `formatCurrency`, `formatNumber`, `formatDate`, `formatDateTime`, `formatMonthYear` with various locales, currencies, and time zones. Mock `getLocale` from paraglide. |
| `src/configs/env.ts`      | Lazy proxy behavior: validates on first access, `SKIP_ENV_VALIDATION` bypass, missing required vars throw, defaults applied.                                           |
| `src/lib/logging/hash.ts` | Deterministic HMAC output, different secrets produce different hashes. Already has tests.                                                                              |
| `src/lib/cookies.ts`      | `serializeServerCookie` output format, `createServerCookies` parsing, `appendSetCookieHeaders` appending.                                                              |
| `src/lib/utils.ts`        | `cn` class merging (tailwind-merge + clsx).                                                                                                                            |

### Vitest environments

Most tests use `jsdom` (the default). Tests that need Node-only APIs
(like `crypto` for hash tests) should add a file-level comment:

```ts
// @vitest-environment node
```

The `unit` and `integration` projects already use different environments
(`jsdom` and `node`). For unit tests that need Node-only APIs within the
jsdom project, add a `// @vitest-environment node` file-level comment.

## Integration tests

Integration tests run `insertX` factories and scenario builders against
a real Postgres database. They require Docker Compose to be running
(`pnpm docker:up`).

### How it works

1. **`test/global-setup.ts`** creates a `finance_tracker_test` database
   (idempotent) via raw `pg.Client`, rewrites `process.env.DATABASE_URL`
   to point at it, runs Drizzle migrations, and resets all schema tables
   once for a clean baseline.
2. **`test/integration-setup.ts`** exports a `test` fixture via
   `test.extend` that provides a `db` wrapped in a transaction
   (`BEGIN`/`ROLLBACK`) with per-test `SAVEPOINT`s.
3. Tests use `*.integration.test.ts` suffix and are picked up by the
   `integration` project in `vitest.config.ts`.
4. Integration tests run in parallel (`pool: 'forks'`) — each file
   gets its own connection and transaction, so no cross-file conflicts.

### Writing integration tests

Uses `test.extend` fixtures for composable, type-safe DB access:

```ts
import { expect } from 'vitest';

import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

test('inserts a user', async ({ db }) => {
  const user = await insertUser(db);
  expect(user.id).toBeDefined();
});
```

The `db` fixture is test-scoped. Each file opens one connection inside
a `BEGIN`/`ROLLBACK`, and each test gets its own `SAVEPOINT`.

### Key files

| File                        | Purpose                                                   |
| --------------------------- | --------------------------------------------------------- |
| `test/db.ts`                | `createTestDb()` — single-connection drizzle instance     |
| `test/global-setup.ts`      | Creates test DB, runs migrations, resets schema tables    |
| `test/integration-setup.ts` | `test.extend` fixture — transaction rollback + savepoints |
| `vitest.config.ts`          | `test.projects` with `unit` and `integration`             |

## E2E tests

E2E tests use [Playwright](https://playwright.dev/) with Chromium.

### Commands

```bash
pnpm test:e2e       # run all E2E tests headless
pnpm test:e2e:ui    # open Playwright UI mode for debugging
```

### Configuration

- **Config**: `playwright.config.ts`
- **Test directory**: `e2e/`
- **TypeScript**: `e2e/tsconfig.json` (separate from root — relaxed
  `noUnusedLocals`/`noUnusedParameters`)
- **Browser**: Chromium only (add Firefox/WebKit projects as needed)
- **Dev server**: Playwright starts `pnpm dev` automatically (port 3000)
- **Retries**: 2 in CI, 0 locally
- **Timeouts**: 30s test, 10s action, 15s navigation, 5s assertion
- **Artifacts**: Screenshots on failure, video retained on failure,
  traces on first retry
- **Reporters**: HTML locally, GitHub annotations + blob in CI
- **Flaky tests**: `failOnFlakyTests` enabled in CI — retried tests
  that pass on retry still fail the build
- **ESLint**: `eslint-plugin-playwright` with `flat/recommended` rules
  scoped to `e2e/**/*`

### Directory structure (target)

```text
e2e/
  setup/
    auth.setup.ts            # storageState setup project
  fixtures/
    index.ts                 # hydration helpers (waitForHydration, etc.)
    authenticated.fixture.ts # test.extend with auth context
  app/
    shell.test.ts            # @smoke @a11y
  accounts/
    crud.test.ts             # @crud
    list.test.ts             # @smoke @a11y
  auth/
    sign-in.test.ts          # @smoke @auth @a11y
    sign-up.test.ts          # @smoke @auth @a11y
    sign-out.test.ts         # @auth
  .auth/                     # gitignored (playwright/.auth)
```

Feature folders generally correspond to `src/modules/`, plus an
`app/` folder for shell-level tests. Each file covers a specific
flow. Tags are applied per `test.describe`, not per file.

### Tags

| Tag      | Purpose                        | Planned CI gate |
| -------- | ------------------------------ | --------------- |
| `@smoke` | Page loads, renders, redirects | Every PR        |
| `@a11y`  | Contrast, ARIA checks via Axe  | Every PR        |
| `@auth`  | Sign-in/sign-up/sign-out flows | Merge to main   |
| `@crud`  | Feature happy-path CRUD        | Merge to main   |

CI currently runs all tags; per-tag filtering will be added when
the suite is large enough to benefit.

Filter: `pnpm test:e2e -- --grep @smoke`

### Writing tests

Tests live in `e2e/` and use Playwright's test runner (not Vitest).
Import `test`/`expect` from `@playwright/test` directly. Import
hydration helpers from `~e2e/fixtures`.

```ts
import { expect, test } from '@playwright/test';

import { waitForHydration } from '~e2e/fixtures';

test('example', async ({ page }) => {
  await page.goto('/sign-in');
  await waitForHydration(page);
  await expect(page.getByRole('heading')).toBeVisible();
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

### Locator strategy

Use Playwright's built-in locators in this priority order. CSS
selectors and XPath are fragile and should be avoided.

| Priority | Locator              | When to use                       | Example                                         |
| -------- | -------------------- | --------------------------------- | ----------------------------------------------- |
| 1        | `getByRole()`        | Buttons, headings, links, dialogs | `page.getByRole('button', { name: 'Sign in' })` |
| 2        | `getByText()`        | Non-interactive text content      | `page.getByText('Welcome, John')`               |
| 3        | `getByLabel()`       | Form inputs with labels           | `page.getByLabel('Email')`                      |
| 4        | `getByPlaceholder()` | Inputs without labels             | `page.getByPlaceholder('Search…')`              |
| 5        | `getByAltText()`     | Images                            | `page.getByAltText('logo')`                     |
| 6        | `getByTitle()`       | Elements with title attribute     | `page.getByTitle('Issues count')`               |
| 7        | `getByTestId()`      | Last resort, explicit contract    | `page.getByTestId('balance')`                   |

**Project-specific conventions:**

- **Password fields**: use `getByLabel('Password', { exact: true })`
  because the `PasswordInput` toggle button's aria-label ("Show
  password") contains the substring "Password" and causes a strict
  mode violation without `exact`.
- **Filtering**: narrow lists with `.filter({ hasText })` or
  `.filter({ has: locator })` rather than CSS pseudo-selectors.
- **Chaining**: `page.getByRole('listitem').filter(…).getByRole(…)`
  is preferred over nested CSS selectors.
- **Avoid positional**: `.nth()` and `.first()` break when content
  order changes. Prefer text or role filtering.

### Structured steps with `test.step()`

`test.step()` breaks tests into named phases. Steps appear as
collapsible sections in Playwright's HTML report, so failures are quick
to locate:

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

### Authentication via storageState

Auth is handled by a Playwright setup project that logs in once and
saves session state to `playwright/.auth/user.json`. Authenticated test projects
depend on the setup project and reuse the saved storageState.

**`e2e/setup/auth.setup.ts`**: runs once before authenticated tests:

```ts
import { test as setup } from '@playwright/test';

import { waitForHydration } from '~e2e/fixtures';

setup('authenticate', async ({ page }) => {
  await page.goto('/sign-in');
  await waitForHydration(page);
  await page.getByLabel('Email').fill(process.env.E2E_USER_EMAIL!);
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.E2E_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
```

**`playwright.config.ts`** (target config, three projects):

```ts
projects: [
  { name: 'setup', testDir: 'e2e/setup', testMatch: '*.setup.ts' },
  {
    name: 'chromium:authenticated',
    dependencies: ['setup'],
    use: { storageState: 'playwright/.auth/user.json' },
  },
  {
    name: 'chromium:public',
    use: { storageState: { cookies: [], origins: [] } },
  },
],
```

To test unauthenticated flows within an authenticated test file,
override at the describe level:

```ts
test.describe('redirects when signed out', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('redirects to sign-in', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/sign-in/);
  });
});
```

Import `test` and `expect` from `@playwright/test` directly.
Import hydration helpers from `~e2e/fixtures`. Future custom
fixtures (e.g., `authenticated.fixture.ts`) will export an
extended `test` from `e2e/fixtures/`.

### Useful assertions

Recent Playwright assertions worth knowing:

- `toHaveAccessibleErrorMessage()`: form validation errors linked
  via `aria-errormessage`.
- `toContainClass()`: check for Tailwind classes on an element.
- `toHaveURL(predicate)`: assert on URL content; accepts string,
  regex, or `(url: URL) => boolean` for search param checks.
- `locator.filter({ visible: true })`: narrow to visible elements
  only (replaces chained `.isVisible()` checks).

### What needs E2E testing

These areas require a running app, database, or browser. They are
excluded from unit test coverage:

- **Auth flows**: sign-up, sign-in, OAuth redirects, session handling,
  email verification (`src/lib/auth.ts`, `src/lib/auth-client.ts`).
- **Email sending**: Brevo integration, template rendering
  (`src/lib/email.ts`, `src/modules/auth/emails/*`).
- **Database operations**: Drizzle queries, migrations
  (`src/db/*`, `src/modules/*/queries/*`).
- **Route rendering**: TanStack Router pages, loaders, server functions
  (`src/routes/**`).
- **Nitro plugins**: evlog drain, server lifecycle
  (`src/lib/logging/drain.ts`).
- **File uploads**: `src/hooks/use-file-upload.ts` (browser APIs +
  server endpoint).
- **Components**: interactive behavior requiring DOM events and state
  (`src/components/**`).

### Per-feature test expectations

Every feature should include at minimum:

| Layer                 | What                                         | When                                    |
| --------------------- | -------------------------------------------- | --------------------------------------- |
| Server function tests | Validate inputs, business logic, error cases | TDD — write before implementation       |
| Unit tests            | Complex hooks, validators, formatters        | Write alongside or after implementation |
| E2E test              | Happy-path user flow with `test.step()`      | Write after feature is functional       |

**TDD for server functions**: Write the test first, then implement the
server function to pass it. The API contract is defined before the
implementation.

**Test-after for UI**: Components and pages are tested via E2E after
the feature works. Unit-test complex client logic (hooks, validators)
but skip unit tests for simple rendering.

### Future considerations

- Secrets for authenticated tests via `dotenvx encrypt` (encrypted
  `.env.production.local` in repo for CI).
- Firefox/WebKit projects for cross-browser coverage.
- CI sharding for parallel execution as the suite grows.
- Mobile/responsive testing via separate device projects (not
  `setViewportSize`).
- `webServer.wait` to detect server readiness by stdout pattern
  instead of port polling.

## CI integration

Test jobs run in `.github/workflows/ci.yml`.

### Unit tests (`unit-tests`)

1. Copies `.env.example` to `.env` (provides dummy values that pass
   validation).
2. Runs `pnpm test:coverage`.
3. Posts a coverage summary via
   [vitest-coverage-report-action](https://github.com/davelosert/vitest-coverage-report-action)
   as a PR comment and step summary.

### Integration tests (`integration-tests`)

1. Starts a `postgres:18-alpine` service container.
2. Copies `.env.example` to `.env`.
3. Runs `pnpm test:integration` — `globalSetup` creates the test DB
   and migrates it.

### E2E tests (`e2e-tests`)

1. Copies `.env.example` to `.env`.
2. Compiles Paraglide messages.
3. Caches Playwright browsers (`~/.cache/ms-playwright`, keyed on
   lockfile).
4. Installs Chromium with system dependencies.
5. Runs `pnpm test:e2e` with `failOnFlakyTests` enabled.
6. Uploads blob report as artifact (14-day retention).

To debug CI failures locally from blob reports:

```bash
npx playwright merge-reports --reporter html ./blob-report
```

### Coverage thresholds

No thresholds yet. Cover pure logic first; add thresholds once
there's a stable baseline.
