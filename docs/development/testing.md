# Testing

Testing strategy and commands.

CI policy and automation decisions are defined in
`docs/adr/0011-ci-and-renovate.md`.

## Prerequisites

- `.env.schema` provides defaults. Create `.env.local` for personal
  overrides (or use 1Password Environments).

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
- **Env loading**: `varlock/auto-load` in `test/setup.ts` (unit) and
  `test/global-setup.ts` (integration). Integration tests set
  `APP_ENV=test` to load `.env.test` (test database URL).

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
`Tag`, `Transaction`, `Transfer`, `AccountTerms`,
`AccountBalanceSnapshot`, `CreditCardCatalog`, `TransactionTag`,
`BudgetPeriod`, `BudgetLine`, `Import`.

### Type aliases

Entity types (`User`, `LedgerAccount`, `Transaction`, etc.) and their
insert counterparts (`UserInsert`, `LedgerAccountInsert`, etc.) are
exported from module `models.ts` files (generated from Drizzle tables
via `drizzle-arktype`). Import types from the module models directly
(e.g., `@/modules/accounts/models`), not from the `@/db/schema`
barrel. Factories do not derive types locally.

Factory params use `Pick<XInsert, ...requiredFKs> & Partial<XInsert>`
for required FK fields (one or more), or `Partial<XInsert>` when
there are no required FKs (e.g., `User`, `CreditCardCatalog`).

Composite factories reduce multi-step setup to a single call:

- `insertAccountWithUser(db)`: user + account
- `insertCategoryWithUser(db)`: user + category
- `insertBudgetPeriodWithUser(db)`: user + budget period
- `insertAccountTermsWithAccount(db)`: user + account + terms
- `insertTransactionWithRelations(db, { withCategory, withPayee })`:
  user + account + optional category/payee + transaction

Scenario builders in `test/scenarios/` compose multiple factories:

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
| `.env.schema`             | Varlock schema validation, `@required`/`@optional` decorators, `forEnv()` conditionals, type generation.                                                               |
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
   `test.extend` with three fixtures: `fileDb` (file-scoped
   Drizzle-managed transaction, rolled back via thrown error),
   `db` (per-test `SAVEPOINT`), and `serviceDb` (nested transaction
   for services that call `.transaction()` internally).
3. Tests use `*.integration.test.ts` suffix and are picked up by the
   `integration` project in `vitest.config.ts`.
4. Integration tests run in parallel (`pool: 'forks'`) — each file
   gets its own connection and transaction, so no cross-file conflicts.

### Service layer testing

Service functions (`services/*.ts`) contain business logic extracted
from API handlers. They are the primary target for integration tests.

Mutating services call `database.transaction()` internally. The
`serviceDb` fixture wraps the test `db` in a Drizzle `.transaction()`,
so services' nested `.transaction()` calls become savepoints instead
of real `BEGIN`/`COMMIT` that would break fixture isolation.

**Which fixture to use:**

| Scenario                                | Fixture     |
| --------------------------------------- | ----------- |
| Mutating service (create/update/delete) | `serviceDb` |
| Everything else (queries, read-only)    | `db`        |

```ts
import type { Db } from '@/db';

import { type Db as TestDb } from '~test/factories/base';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('creates transaction', async ({ serviceDb }) => {
  const result = await createTransactionService(asDb(serviceDb), userId, data);
  expect(result.id).toBeDefined();
});

test('lists transactions', async ({ db }) => {
  const rows = await listTransactionsService(asDb(db), userId);
  expect(rows).toHaveLength(1);
});
```

The `serviceDb` fixture uses a type assertion (`tx as unknown as Db`)
because `NodePgTransaction` is not directly assignable to
`NodePgDatabase` in TypeScript's structural type system. This is safe
— `PgTransaction extends PgDatabase` at runtime, so all query methods
are available.

Server function handlers (`api/*.ts`) are thin wrappers — they handle
auth, validation, logging, and error mapping. Test them via E2E tests,
not integration tests.

### Test placement

| What you're testing                          | Where it lives                           |
| -------------------------------------------- | ---------------------------------------- |
| Service business logic (CRUD, auth, audit)   | `services/<service>.integration.test.ts` |
| DB schema constraints (unique, FK, partial)  | `db/schema.integration.test.ts`          |
| Domain helpers (resolve\*, format\*)         | `lib/*.integration.test.ts`              |
| API handlers (auth, validation, error map)   | E2E tests                                |
| `throwIfConstraintViolation` message mapping | `src/lib/db/pg-error.test.ts` (unit)     |

**One test file per service.** Name it after the service file:
`create-account.ts` → `create-account.integration.test.ts`. Do not
combine multiple services into one test file.

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
a Drizzle-managed transaction (rolled back after all tests complete),
and each test gets its own `SAVEPOINT`.

**Do not call `db.transaction()` directly** in test bodies — use
the `serviceDb` fixture instead when testing services that call
`.transaction()` internally. The `serviceDb` wrapper ensures nested
transactions become savepoints and preserves test isolation.

### Key files

| File                        | Purpose                                                   |
| --------------------------- | --------------------------------------------------------- |
| `test/db.ts`                | `createTestDb()` — single-connection drizzle instance     |
| `test/global-setup.ts`      | Creates test DB, runs migrations, resets schema tables    |
| `test/integration-setup.ts` | `test.extend` fixture — transaction rollback + savepoints |
| `vitest.config.ts`          | `test.projects` with `unit` and `integration`             |

## E2E tests

See [e2e/](e2e/) for the full E2E guide:
configuration, locators, assertions, accessibility testing,
authentication, input patterns, and test organization.

## CI integration

Test jobs run in `.github/workflows/ci.yml`.

### Unit tests (`unit-tests`)

1. `.env.schema` defaults provide valid dummy values.
2. Runs `pnpm test:coverage`.
3. Posts a coverage summary via
   [vitest-coverage-report-action](https://github.com/davelosert/vitest-coverage-report-action)
   as a PR comment and step summary.

### Integration tests (`integration-tests`)

1. Starts a `postgres:18-alpine` service container.
2. Runs `pnpm test:integration` — `globalSetup` creates the test DB
   and migrates it.

### E2E tests (`e2e-tests`)

1. Compiles Paraglide messages.
2. Caches Playwright browsers (`~/.cache/ms-playwright`, keyed on
   lockfile).
3. Installs Chromium with system dependencies.
4. Runs `pnpm test:e2e` with `failOnFlakyTests` enabled.
5. Uploads blob report as artifact (14-day retention).

To debug CI failures locally from blob reports:

```bash
npx playwright merge-reports --reporter html ./blob-report
```

### Coverage thresholds

No thresholds yet. Cover pure logic first; add thresholds once
there's a stable baseline.
