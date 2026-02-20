# Testing

Testing strategy and commands.

CI policy and automation decisions are defined in
`docs/adr/0011-ci-and-renovate.md`.

## Prerequisites

- Copy `.env.example` to `.env` for local runs (or use 1Password
  Environments).

## Commands

```bash
pnpm test            # run all unit tests once
pnpm test:watch      # run in watch mode
pnpm test:coverage   # run with coverage report
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

- **Vitest config**: `vitest.config.ts` (separate from `vite.config.ts`
  to avoid loading Nitro/TanStack Start).
- **Test setup**: `test/setup.ts` (cleanup, jest-dom matchers).
- **Globals**: `describe`, `it`, `expect` are available without imports.
- **Env loading**: dotenvx `flow` convention loads `.env` automatically.

### Why a separate vitest config?

TanStack Start's `vite.config.ts` registers Nitro modules, evlog
plugins, and TanStack Router — none of which should run during unit
tests. A separate `vitest.config.ts` that only includes path aliases and
React keeps tests fast and avoids Nitro side effects.

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
| `src/lib/error-ids.ts`    | Type-level tests (`test-d.ts`) to verify `ErrorId` union stays in sync with `errorIds`.                                                                                |

### Vitest environments

Most tests use `jsdom` (the default). Tests that need Node-only APIs
(like `crypto` for hash tests) should add a file-level comment:

```ts
// @vitest-environment node
```

If tests with different environments become common, consider using
[Vitest projects](https://vitest.dev/guide/workspace) in a single
config to avoid per-file annotations.

## E2E tests

E2E tests are not yet configured. The CI workflow has a scaffolded job
(currently disabled with `if: false`).

### What needs E2E testing

These areas require a running app, database, or browser and are
explicitly excluded from unit test coverage:

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

### Future plan

- Tool: Playwright.
- Will require real secrets — plan to use `dotenvx encrypt` to store
  encrypted `.env.production.local` in the repo for CI.
- Separate CI job (`e2e-tests`) with longer timeout (30 min).

## CI integration

The `unit-tests` job in `.github/workflows/ci.yml`:

1. Copies `.env.example` to `.env` (provides dummy values that pass
   validation).
2. Runs `pnpm test:coverage`.
3. Posts a coverage summary via
   [vitest-coverage-report-action](https://github.com/davelosert/vitest-coverage-report-action)
   as a PR comment and step summary.

### Coverage thresholds

No thresholds are enforced yet. Focus on meaningful coverage of pure
logic first — thresholds can be added once there's a stable baseline.
