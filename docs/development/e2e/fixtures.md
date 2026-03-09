# Fixtures

[Back to E2E Testing](README.md)

## Project fixtures

### `testAccountName`

A test-scoped fixture with worker-level caching for transaction
tests. The account is created via the UI on the first test that
requests it within a worker process; subsequent tests reuse the
cached name. It cannot be `{ scope: 'worker' }` because it
depends on `page`, which is test-scoped.

```ts
import { expect, test } from '~e2e/fixtures/auth';

test('creates a transaction', async ({ page, testAccountName }) => {
  // testAccountName is already created — use it directly
  await selectAccount(page, testAccountName);
});
```

Tests that don't need an account (empty state, validation) should
omit `testAccountName` from their destructuring to avoid triggering
the lazy creation.

## Fixture basics

Fixtures provide reusable setup/teardown logic injected into tests
via function arguments. Playwright's built-in fixtures (`page`,
`context`, `browser`, `request`) are always available. Custom
fixtures extend them with `test.extend()`.

See [auth.md](auth.md) for the POM fixture pattern and
`makeAxeBuilder` in [accessibility.md](accessibility.md) for a
factory fixture example.

## Fixture scoping

By default, fixtures are created per-test. Use `{ scope: 'worker' }`
for expensive one-time setup shared across all tests in a worker
process:

```ts
import { test as base } from '@playwright/test';

type WorkerFixtures = { dbUser: { id: string; email: string } };

const test = base.extend<{}, WorkerFixtures>({
  dbUser: [
    async ({}, use) => {
      // Runs once per worker — seed a test user
      const user = await seedTestUser();
      await use(user);
      // Teardown: clean up after all tests in this worker
      await deleteTestUser(user.id);
    },
    { scope: 'worker' },
  ],
});
```

Worker fixtures share their value across all tests in the same
worker. Use them for DB seeding, API auth tokens, or any setup
that would be too slow per-test.

**`workerIndex` vs `parallelIndex`:**

- `workerInfo.workerIndex` — unique per worker process for the
  entire run. Never reused. Use for naming resources that must not
  collide (temp DB names, log files).
- `testInfo.parallelIndex` — ranges from 0 to (workers-1), reused
  across retries. Use for partitioning a fixed pool of resources
  (pre-seeded user accounts).

```ts
const test = base.extend<{}, { workerDb: string }>({
  workerDb: [
    async ({}, use, workerInfo) => {
      const dbName = `e2e_worker_${workerInfo.workerIndex}`;
      await createDatabase(dbName);
      await use(dbName);
      await dropDatabase(dbName);
    },
    { scope: 'worker' },
  ],
});
```

## Automatic fixtures

Fixtures with `{ auto: true }` run for every test without being
listed in the test signature:

```ts
const test = base.extend<{ saveLogsOnFailure: void }>({
  saveLogsOnFailure: [
    async ({ page }, use, testInfo) => {
      await use();
      // Runs after the test — attach server logs on failure
      if (testInfo.status !== testInfo.expectedStatus) {
        const logs = await page.request.get('/api/debug/logs');
        await testInfo.attach('server-logs', {
          body: await logs.text(),
          contentType: 'text/plain',
        });
      }
    },
    { auto: true },
  ],
});
```

Auto fixtures are invisible to tests (they don't appear in the
test function parameters). Use them for logging, screenshots, or
performance instrumentation that should apply globally.

## Composing fixtures with `mergeTests()`

When multiple fixture modules each export their own `test`, merge
them into a single `test` that has all fixtures available:

```ts
// e2e/fixtures/index.ts
import { mergeTests } from '@playwright/test';
import { test as a11yTest } from '~e2e/fixtures/a11y.fixture';
import { test as accountsTest } from '~e2e/fixtures/accounts.fixture';

export const test = mergeTests(a11yTest, accountsTest);
export { expect } from '@playwright/test';
```

```ts
// e2e/accounts/crud.test.ts
import { expect, test } from '~e2e/fixtures';

test('creates an account', async ({ accountsPage, makeAxeBuilder }) => {
  // Both fixtures available from merged test
});
```

Use `mergeTests()` when you have 3+ fixture files. For 1-2, chain
`base.extend()` calls instead.

## Boxed fixtures

Boxed fixtures hide their internal steps from the HTML report,
reducing noise for helper fixtures:

```ts
const test = base.extend<{ accountsPage: AccountsPage }>({
  accountsPage: [
    async ({ page }, use) => {
      await use(new AccountsPage(page));
    },
    { box: true },
  ],
});
```

When a boxed fixture fails, the HTML report shows the failure at
the test level, not buried inside fixture setup steps.

## Fixture options

Make fixture values configurable via `playwright.config.ts` or
`test.use()`:

```ts
type TestOptions = { defaultLocale: string };

const test = base.extend<TestOptions>({
  defaultLocale: ['en-US', { option: true }],
});
```

Override per-project in config:

```ts
// playwright.config.ts
projects: [
  {
    name: 'en',
    use: { defaultLocale: 'en-US' },
  },
  {
    name: 'de',
    use: { defaultLocale: 'de-DE' },
  },
],
```

Or per-describe in tests:

```ts
test.describe('German locale', () => {
  test.use({ defaultLocale: 'de-DE' });
  // tests here receive 'de-DE'
});
```

This is how you parameterize projects: run the same test suite
across locale, currency, or feature-flag variants without
duplicating test code.

## Fixture timeout

Set an independent timeout on a slow fixture (distinct from the
test timeout):

```ts
const test = base.extend<{}, { seededData: SeedResult }>({
  seededData: [
    async ({}, use) => {
      const data = await seedLargeDataset(); // slow
      await use(data);
      await cleanupDataset(data);
    },
    { scope: 'worker', timeout: 60_000 },
  ],
});
```

Fixture timeouts are separate from the per-test timeout — a
fixture can have a longer setup/teardown budget without inflating
every test's timeout.

## Data-driven tests

Use `forEach()` to generate multiple test cases from a data array:

```ts
const accountTypes = [
  { type: 'checking', label: 'Checking Account' },
  { type: 'savings', label: 'Savings Account' },
  { type: 'credit', label: 'Credit Card' },
];

for (const { type, label } of accountTypes) {
  test(`creates a ${type} account`, async ({ page }) => {
    await page.goto('/accounts/new');
    await page.getByLabel('Account Type').selectOption(type);
    await page.getByLabel('Name').fill(label);
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText(label)).toBeVisible();
  });
}
```

Each iteration produces a separate named test in the report.
`beforeEach`/`afterEach` hooks declared **outside** the loop apply
to all generated tests. Hooks **inside** the loop apply only to
that iteration.

**CSV-driven tests** (for data-heavy scenarios like import
validation):

```ts
import fs from 'node:fs';

const rows = fs
  .readFileSync('e2e/data/currencies.csv', 'utf-8')
  .trim()
  .split('\n')
  .slice(1) // skip header
  .map((line) => line.split(','));

for (const [code, symbol, name] of rows) {
  test(`formats ${code} currency`, async ({ page }) => {
    // ...
  });
}
```
