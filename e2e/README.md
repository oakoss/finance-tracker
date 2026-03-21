# E2E Tests

Playwright E2E tests running against a production build.

## Prerequisites

```bash
pnpm exec playwright install chromium --with-deps
pnpm docker:up          # start PostgreSQL + Mailpit
pnpm db:migrate         # run migrations
pnpm db:seed --profile e2e  # seed E2E test users
```

## Running Tests

| Command                                     | What it does                           |
| ------------------------------------------- | -------------------------------------- |
| `pnpm test:e2e`                             | Full suite (all projects)              |
| `pnpm test:e2e:smoke`                       | Smoke tests only (`@smoke` tag)        |
| `pnpm test:e2e:a11y`                        | Accessibility tests only (`@a11y` tag) |
| `pnpm test:e2e:stress`                      | Stress tests only (`@stress` tag)      |
| `pnpm test:e2e -- --ui`                     | Interactive UI mode                    |
| `pnpm test:e2e -- --last-failed`            | Rerun only tests that failed last      |
| `pnpm test:e2e -- e2e/app/accounts.test.ts` | Single file                            |

The web server starts automatically (`pnpm build && pnpm start`).
Locally, an already-running server on port 3000 is reused.

## Project Structure

```text
e2e/
  setup/          db.setup.ts — seed + cleanup (runs first via project dependency)
  app/            feature tests (accounts, transactions, budgets, etc.)
  auth/           sign-in, sign-up, sign-out, redirect guard, reverse auth guard
  demo/           component demo screenshot tests
  fixtures/
    auth.ts       test/expect exports, worker auth, testAccountName, hydration auto-wait, toast auto-dismiss, pageerror detection
    entity.ts     createAccount(), createCategory()
    combobox.ts   createViaCombobox(), selectExistingCombobox()
    table-actions.ts  clickRowAction(), openEditDialog(), confirmDelete(), isEmptyState()
    import-actions.ts uploadCsv(), uniqueCsv()
    field.ts      getField() — locate form field by label
    a11y.ts       a11yScan() — axe-core WCAG scan
    constants.ts  E2E_EMAIL, E2E_PASSWORD, E2E_USER_COUNT
    mailpit.ts    MailpitClient for email verification tests
    index.ts      waitForHydration()
```

## Writing Tests

**File placement:** Feature tests go in `e2e/app/`, auth tests in
`e2e/auth/`. Test files use `*.test.ts` suffix.

**Import `test` and `expect` from `~e2e/fixtures/auth`** for
authenticated tests. This gives you hydration auto-wait, pageerror
detection, and toast auto-dismiss. Public tests import directly from
`@playwright/test`.

**Use shared fixtures** from `e2e/fixtures/` for entity creation,
table actions, and combobox interactions. All fixtures use
`test.step({ box: true })` so errors point to your test, not the
fixture internals.

**`test.slow()`** triples the timeout. Use it with a reason for
genuinely slow operations (multi-step CRUD, file uploads). If many
tests need it, the test or app has a performance issue.

## Test Data

Each test creates its own data with `Date.now()` suffixes:

```ts
const name = `E2E Acct ${Date.now()}`;
```

**Worker isolation:** Each Playwright worker signs in as a separate
E2E user (`e2e-worker-0@test.local` through `e2e-worker-5@test.local`).
Auth state is saved to `playwright/.auth/worker-{id}.json`.

**Account fixture:** Tests that need a ledger account use the
`testAccountName` fixture. It creates one account per worker and
caches it for reuse.

**Cleanup lifecycle:** `db.setup.ts` wipes all E2E user data (accounts,
categories, imports, budgets; FK cascades handle transactions and
other child rows) before the suite runs. Tests create
fresh data on top of a clean slate. Next run cleans again.

**`isEmptyState()`** checks whether an empty-state message is visible
(3s timeout). Tests use it to conditionally skip when data already
exists from other tests on the same worker. This is intentional.

## Assertions

Assert outcomes, not feedback. A visible row or a closed dialog
proves the mutation worked. A toast does not.

```ts
// GOOD — assert the outcome
await page.getByRole('button', { name: /create/i }).click();
await expect(page.getByText(name)).toBeVisible();

// GOOD — assert dialog closed (for fixtures/setup steps)
await page.getByRole('button', { name: /create/i }).click();
await expect(
  page.getByRole('heading', { name: /create account/i }),
).toBeHidden();

// BAD — toast timing is unreliable
await expectToast(page, 'Account created');
```

Always use web-first assertions that auto-retry:

```ts
// GOOD — auto-retries until timeout
await expect(locator).toBeVisible();

// BAD — one-shot check, fails on timing
expect(await locator.isVisible()).toBe(true);
```

## Reliability Rules

1. Use `Date.now()` suffix for all entity names
2. Assert outcomes (row visible, dialog closed), not toasts
3. Use web-first assertions (`toBeVisible`, `toHaveText`)
4. Never use `page.waitForTimeout()` — rely on auto-waiting
5. Use `test.step()` for multi-phase tests
6. Use `{ box: true }` on shared fixture helpers
7. Handle combobox: click, wait for listbox, select by role
8. Use `test.slow()` only with a reason for genuinely slow ops
9. Scope assertions to containers when text may appear elsewhere
   (e.g., `page.getByRole('table').getByText(name)`)
10. Don't use `test.describe.serial()` unless tests genuinely
    depend on execution order

## Tags and Filtering

| Tag              | Purpose                      | Projects that run it          |
| ---------------- | ---------------------------- | ----------------------------- |
| `@smoke`         | Critical-path checks         | chromium:authenticated/public |
| `@authenticated` | Requires sign-in             | chromium:authenticated        |
| `@mobile`        | Runs on mobile viewports     | iphone, pixel                 |
| `@a11y`          | Accessibility scans          | chromium:public/authenticated |
| `@stress`        | Load/perf tests (local only) | stress                        |
| `@demo`          | Component demo screenshots   | chromium:demo                 |

Filter with `--grep` and `--project`:

```bash
pnpm test:e2e -- --grep @smoke --project="chromium:authenticated"
```

## Debugging

**HTML report:** Opens automatically after a local run with failures.

**Traces:** Captured on first retry (`trace: 'on-first-retry'`).
Open with `pnpm exec playwright show-trace <path>`.

**Screenshots:** Taken only on failure. **Video:** Always recorded,
retained only on failure. Saved to `test-results/`.

**`--last-failed`:** Reruns only tests that failed in the previous
run. Useful when iterating on a fix.

**`captureGitInfo`** is enabled — the HTML report shows which commit
and diff each test ran against.

## CI Architecture

| Trigger                    | Job         | What runs                                | Sharding |
| -------------------------- | ----------- | ---------------------------------------- | -------- |
| PR                         | `e2e-smoke` | `@smoke`, chromium desktop only          | No       |
| Push to main / merge queue | `e2e-full`  | Desktop + mobile (excludes demo, stress) | 2 shards |

Sharded runs upload per-shard blob reports. A merge job combines
them into a single unified report artifact.

Stress tests (`@stress`) run locally only:
`pnpm test:e2e -- --project stress`.
