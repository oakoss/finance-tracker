# Configuration Deep Dive

[Back to E2E Testing](README.md)

See [README.md](README.md) for the quick-reference configuration
list. This file covers advanced config patterns.

## Parallel execution

By default, test **files** run in parallel across workers, but
tests within a file run sequentially.

**`fullyParallel`** — run individual tests in parallel (not just
files). Our config enables this globally. Set per-project to override:

```ts
// playwright.config.ts
export default defineConfig({
  fullyParallel: true, // all tests in all files run in parallel
  // OR per-project:
  projects: [
    { name: 'smoke', fullyParallel: true },
    { name: 'crud', fullyParallel: false },
  ],
});
```

**Per-describe overrides:**

```ts
// Run tests in this block in parallel (within the same file)
test.describe.configure({ mode: 'parallel' });

test('create account', async ({ page }) => {
  /* ... */
});
test('edit account', async ({ page }) => {
  /* ... */
});
```

```ts
// Run tests sequentially — skip remaining if one fails.
// Useful for multi-step flows where each test depends on
// the previous one's state.
test.describe.configure({ mode: 'serial' });

test('step 1: create account', async ({ page }) => {
  /* ... */
});
test('step 2: edit account', async ({ page }) => {
  /* ... */
});
test('step 3: delete account', async ({ page }) => {
  /* ... */
});
```

```ts
// Opt out of fullyParallel for a specific describe block
test.describe.configure({ mode: 'default' });
```

Serial mode retries the **entire block** together, not individual
tests. Use it sparingly — independent tests with proper setup are
more reliable.

**`maxFailures`** — abort the run early when a blocking failure
makes further tests pointless:

```ts
// playwright.config.ts
export default defineConfig({
  maxFailures: 5, // stop after 5 failures
});
```

CLI: `pnpm test:e2e -- --max-failures=5` or `-x` to stop after
the first failure.

## Reporters

**Multi-reporter config** — use multiple reporters simultaneously:

```ts
// playwright.config.ts
export default defineConfig({
  reporter: process.env.CI
    ? [['github'], ['blob'], ['html', { open: 'never' }]]
    : [['html', { open: 'on-failure' }]],
});
```

**Available reporters:**

| Reporter | Output                      | When to use                  |
| -------- | --------------------------- | ---------------------------- |
| `list`   | One line per test (default) | Local development            |
| `line`   | Single updating line        | Large suites (50+ tests)     |
| `dot`    | Single character per test   | Compact CI output            |
| `html`   | Interactive HTML report     | Local + CI artifacts         |
| `blob`   | Binary for merging shards   | Sharded CI runs              |
| `json`   | JSON file                   | CI integrations, dashboards  |
| `junit`  | JUnit XML                   | Datadog, GitHub test summary |
| `github` | GitHub Actions annotations  | PR annotations               |

**`printSteps`** — show `test.step()` names in terminal output:

```ts
reporter: [['list', { printSteps: true }]],
```

Pairs with the project's `test.step()` convention for readable
local output.

**`PLAYWRIGHT_HTML_OPEN`** — control when the HTML report
auto-opens:

```bash
PLAYWRIGHT_HTML_OPEN=never pnpm test:e2e  # suppress in scripts
PLAYWRIGHT_HTML_OPEN=always pnpm test:e2e # always open
```

Values: `always`, `never`, `on-failure` (default).

**Blob merge workflow** (for sharded CI runs):

```bash
# Each shard produces a blob
pnpm test:e2e -- --shard=1/4 --reporter=blob
pnpm test:e2e -- --shard=2/4 --reporter=blob
# ...

# Merge all shards into a single HTML report
npx playwright merge-reports ./blob-report --reporter=html
```

## Projects

**Teardown projects** — auto-cleanup after all dependents finish:

```ts
// playwright.config.ts
projects: [
  {
    name: 'setup db',
    testMatch: '**/db.setup.ts',
    teardown: 'cleanup db',
  },
  {
    name: 'cleanup db',
    testMatch: '**/db.teardown.ts',
  },
  {
    name: 'chromium:authenticated',
    dependencies: ['setup db'],
    use: { storageState: 'playwright/.auth/user.json' },
  },
],
```

The teardown project runs after all projects that depend on the
setup project complete, regardless of pass/fail.

**`--no-deps`** — skip setup dependencies when iterating locally:

```bash
# Skip re-running auth setup (reuse existing storageState)
pnpm test:e2e -- --project=chromium:authenticated --no-deps
```

Useful when `playwright/.auth/user.json` already exists from a
previous run and you're iterating on a specific test.

**Per-environment projects** — different `baseURL` and retry
counts for staging vs production:

```ts
projects: [
  {
    name: 'staging',
    use: { baseURL: 'https://staging.finance.oakoss.dev' },
    retries: 3,
  },
  {
    name: 'production',
    use: { baseURL: 'https://finance.oakoss.dev' },
    retries: 0,
  },
],
```

**`testMatch`/`testIgnore` for suite segregation:**

```ts
projects: [
  {
    name: 'smoke',
    testMatch: '**/*.smoke.ts',
    fullyParallel: true,
  },
  {
    name: 'full',
    testIgnore: '**/*.smoke.ts',
  },
],
```

Alternative to `--grep @smoke` filtering when you want distinct
CI gates with different parallelism or retry settings.

## Setup and teardown

**`globalSetup` / `globalTeardown`** — we use the setup project
pattern instead (documented in [auth.md](auth.md)) because it
integrates with traces, HTML reports, and fixtures. The older
`globalSetup`/`globalTeardown` config options run outside the test
runner and lack these integrations:

```ts
// We do NOT use this — documented for awareness only
export default defineConfig({
  globalSetup: './global-setup.ts', // no fixtures, no traces
  globalTeardown: './global-teardown.ts',
});
```

**Passing data from setup to tests via `process.env`:**

```ts
// e2e/setup/db.setup.ts
import { test as setup } from '@playwright/test';

setup('seed test data', async ({ request }) => {
  const response = await request.post('/api/seed');
  const { accountId } = await response.json();
  process.env.E2E_ACCOUNT_ID = accountId;
});
```

```ts
// e2e/accounts/crud.test.ts
test('edits the seeded account', async ({ page }) => {
  await page.goto(`/accounts/${process.env.E2E_ACCOUNT_ID}`);
});
```

**Trace capture in setup on failure** — wrap setup in try/catch
to capture a trace before re-throwing, making CI setup failures
debuggable:

```ts
setup('authenticate', async ({ page }, testInfo) => {
  try {
    await page.goto('/sign-in');
    // ... sign-in steps
  } catch (error) {
    await testInfo.attach('setup-failure-screenshot', {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
    throw error;
  }
});
```

## Timeouts

**`globalTimeout`** — hard cap on the entire test run. Prevents
runaway CI jobs:

```ts
// playwright.config.ts
export default defineConfig({
  globalTimeout: 30 * 60 * 1_000, // 30 minutes for entire run
});
```

Distinct from per-test timeout. If the global timeout expires,
all running tests are aborted.

## webServer

The `webServer` config starts the dev server automatically before
tests run. Our config uses `pnpm dev` on port 3000.

**Key options:**

```ts
// playwright.config.ts
export default defineConfig({
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000', // readiness probe (polled until 2xx-403)
    reuseExistingServer: !process.env.CI, // reuse if already running locally
    timeout: 120_000, // startup timeout (default 60s, bump for cold starts)
    stdout: 'pipe', // forward dev server output to terminal
    stderr: 'pipe', // essential for diagnosing startup failures
    env: {
      // pass env vars to the server process
      NODE_ENV: 'test',
      DATABASE_URL: process.env.E2E_DATABASE_URL,
    },
    gracefulShutdown: {
      // clean shutdown (flush DB connections)
      signal: 'SIGTERM',
      timeout: 5_000,
    },
  },
});
```

**`reuseExistingServer`** — set to `!process.env.CI` so locally
the tests use your already-running `pnpm dev`, while CI always
starts a fresh server. Without this, starting tests when `pnpm dev`
is already running either fails or double-starts.

**`webServer.url` vs `use.baseURL`** — these serve different
purposes:

- `webServer.url` is the **readiness probe** — Playwright polls
  it until it returns 2xx-403, then starts running tests
- `use.baseURL` is what tests use for relative `page.goto('/')`
  calls

They are usually the same value but are independent settings.

**Multiple servers** — start additional services (mock SMTP,
background workers) alongside the dev server:

```ts
export default defineConfig({
  webServer: [
    {
      name: 'app',
      command: 'pnpm dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
    },
    {
      name: 'mock-smtp',
      command: 'pnpm mock:smtp',
      url: 'http://localhost:1080',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

The `name` field labels log lines when `stdout: 'pipe'` is set,
making multi-server output readable.

## UI Mode

Beyond the basics (`pnpm test:e2e:ui`), UI Mode has features not
available in headless or Inspector modes:

- **Watch mode** — click the eye icon next to a test to auto-rerun
  it when the test file changes.
- **DOM snapshot pop-out** — detach the DOM snapshot panel into a
  separate browser window and use real DevTools to inspect it.
- **Docker/Codespaces** — UI Mode binds to `localhost` by default.
  For remote dev environments, bind to all interfaces:

```bash
pnpm test:e2e -- --ui --ui-host=0.0.0.0 --ui-port=8080
```

Reminder: UI Mode does not run setup projects automatically. Run
`pnpm test:e2e -- --project=setup` first to generate
`playwright/.auth/user.json`.
