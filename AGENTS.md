# Agent Guide (Finance Tracker)

This document helps agentic coding tools work effectively in this repo.

## Repo Basics

- Package manager: pnpm (`packageManager` in `package.json`).
- Do not use npm in this repo; use pnpm for installs and scripts.
- Node version: use `.nvmrc` (fnm recommended).
- Framework: TanStack Start (React).
- TypeScript: strict mode enabled (`tsconfig.json`).
- Paths alias: `@/*` -> `src/*`.

## Commands

### Install & Dev

```bash
pnpm install
pnpm dev          # runs on port 3000
```

### Build & Preview

```bash
pnpm build
pnpm preview
```

### Lint / Format / Types

```bash
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check
pnpm lint:md
pnpm lint:md:fix
pnpm paraglide:compile  # must run before typecheck/tests (generates JS that TS needs)
pnpm typecheck
```

### Tests

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

Run a single test (Vitest):

```bash
pnpm test -- -t "test name"
```

Run a single file:

```bash
pnpm test -- path/to/file.test.ts
```

Vitest config: `vitest.config.ts` (separate from `vite.config.ts` to avoid loading Nitro/TanStack Start).
Test setup: `test/setup.ts` (cleanup, jest-dom matchers).
Vitest globals are enabled (`describe`, `it`, `expect` — no imports needed).
Tests needing Node-only APIs (e.g., `crypto`) should add `// @vitest-environment node` at the top.

Coverage is collected for `src/lib/**`, `src/configs/**`, and `src/hooks/**`. Auth, email, Nitro plugins, routes, and components are excluded (need E2E).

E2E tests are scaffolded in CI but not configured yet. See `docs/development/testing.md` for full details.

### Database

```bash
pnpm docker:up
pnpm docker:down
pnpm docker:reset
pnpm db:generate
pnpm db:migrate
pnpm db:push
pnpm db:studio
```

Better Auth schema generation (after auth config changes):

```bash
pnpm schema:auth
```

## Code Style

### Formatting & Linting

- Prettier is required (`pnpm format`). Config: `singleQuote: true`, `trailingComma: 'all'`.
- ESLint is strict (`pnpm lint` must be clean, max warnings = 0).
- Markdown lint is enforced (`pnpm lint:md`).
- `sort-keys-plus` enforces alphabetically sorted object keys (all files, objects with 3+ keys, case-insensitive).
- `eqeqeq` is enforced — always use `===`/`!==`.

### Imports

- Prefer absolute imports via `@/`.
- **Avoid barrel files**; import directly from module paths.
- `simple-import-sort` enforces import ordering.
- No parent relative imports (`import-x/no-relative-parent-imports`).

### Conventional Commits

- Commitlint enforces conventional commit format: `type(scope): subject`.
- The `commit-msg` hook rejects non-conforming messages.
- Allowed scopes: `auth`, `ci`, `config`, `db`, `deps`, `docs`, `email`, `env`, `finance`, `i18n`, `infra`, `logging`, `routes`, `scripts`, `tests`, `todos`, `tooling`, `ui`.
- Scope is optional (empty allowed), but custom scopes outside this list are not.
- Header max 200 characters.

### Naming & File Structure

- Filenames must be **kebab-case** (ESLint `unicorn/filename-case`).
- Modules live under `src/modules/*`.
- Shared config lives under `src/configs/*`.
- DB schema aggregator: `src/db/schema.ts` (imports module schemas).

### Generated Files

- Do not edit `src/modules/auth/schema.ts` (Better Auth CLI output).
- Do not edit route tree generation outputs (e.g., `routeTree.gen` if present).

### TypeScript

- Use `type` aliases over `interface`.
- Prefer inline type imports.
- Avoid `any` unless truly necessary.
- `@typescript-eslint/no-floating-promises` is a hard error — every Promise must be awaited, `.catch()`-ed, or prefixed with `void`.
- `noUnusedLocals` and `noUnusedParameters` are enabled. Prefix unused vars/params with `_` to suppress.

### React

- React 19, strict TS.
- `react/jsx-sort-props` is enabled.
- `react-hooks/exhaustive-deps` is off; be intentional with deps.

### Error Handling

- Prefer explicit `throw new Error(...)` for failures.
- Avoid `console` in production code unless allowed by ESLint overrides.

### Documentation Updates

- Update docs/instructions/ADRs when changes affect setup, workflows, or architecture decisions.

## Auth (Better Auth)

- Server config: `src/lib/auth.ts`.
- Client config: `src/lib/auth-client.ts`.
- API route: `src/routes/api/auth/$.ts`.
- TanStack Start cookie handling is enabled (`tanstackStartCookies`).
- Auth middleware available at `src/modules/auth/middleware.ts` (applied at `_app/` layout level).
- Generated schema: `src/modules/auth/schema.ts` (do not edit manually).

## Email (Brevo + React Email)

- Sender config: `src/lib/email.ts`.
- Templates: `src/modules/auth/emails/*`.
- Reply-To support via `EMAIL_REPLY_TO` env var.

## Environment Variables

Local dev uses 1Password Environments (mounts `.env` automatically).
Alternatively, copy `.env.example` to `.env` for dummy values.

Env schema + validation: `src/configs/env.ts` (lazy proxy, validates on first access).
Client env typing: `src/vite-env.d.ts` (augments `import.meta.env`).

Env files are loaded via dotenvx `flow` convention in config files
(`vite.config.ts`, `vitest.config.ts`, `drizzle.config.ts`).
Scripts without a config file use `pnpm with:env` (`start`, `schema:auth:generate`).

Set `SKIP_ENV_VALIDATION=true` to bypass validation in CI builds.

Key groups (see `.env.example` for full list):

- Auth: `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `PASSWORD_MIN_LENGTH`, `TRUSTED_ORIGINS`
- OAuth: `GITHUB_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`
- DB: `DATABASE_URL`
- Email: `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `EMAIL_REPLY_TO`
- Logging: `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`, `LOG_HASH_SECRET`
- Client: `VITE_APP_TITLE`, `VITE_CLIENT_LOGGING_ENABLED`, `VITE_CLIENT_LOG_LEVEL`

## CI / Workflows

- CI: `.github/workflows/ci.yml` (static-analysis + docs-only optimization).
- CodeQL: `.github/workflows/codeql.yml` (monthly, security-extended).
- Dependency Review: `.github/workflows/dependency-review.yml` (paths filtered).

Conventions:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

See `docs/development/workflows.md` for details.

## Architecture Overview

TanStack Start (React 19) full-stack app with SSR, file-based routing, and Nitro v3 as the server runtime. PostgreSQL via Drizzle ORM. Better Auth for authentication. Tailwind CSS v4 with an extended shadcn/ui component library.

### Boot Sequence

1. `src/server.ts` — Server entry; wraps the Nitro handler in Paraglide i18n middleware
2. `src/router.tsx` — Creates the TanStack Router with the auto-generated `routeTree`, global error boundary, and not-found component
3. `src/routes/__root.tsx` — Root HTML shell; renders `<Header />`, `ThemeProvider` (next-themes), portal root, and devtools panels

### Route Conventions

Routes live in `src/routes/` using TanStack Router file-based conventions. The route tree is auto-generated at `src/routeTree.gen.ts`.

- `_app/` — Authenticated layout route; `authMiddleware` applied here, all child routes are protected
- `_auth/` — Public auth layout (login, signup, reset password) wrapping pages in a centered card
- `_public/` — Other public routes, no auth guard
- `api/auth/$.ts` — Splat route handing all `/api/auth/*` to Better Auth's handler
- `demo/` — Demo/example routes (dashboard, drizzle CRUD, auth flow)

### Data Flow Pattern

Server functions use `createServerFn` from `@tanstack/react-start`:

```ts
const getData = createServerFn({ method: 'GET' }).handler(async () => {
  const result = await db.query.table.findMany();
  log.info({ action: 'entity.list', outcome: { count: result.length } });
  return result;
});

const createData = createServerFn({ method: 'POST' })
  .inputValidator((data: { name: string }) => data)
  .handler(async ({ data }) => {
    try {
      await db.insert(table).values(data);
      log.info({ action: 'entity.create', outcome: { success: true } });
      return { success: true };
    } catch (error) {
      throw createError({
        cause: error instanceof Error ? error : new Error(String(error)),
        fix: 'Check the database connection and try again.',
        message: 'Failed to create entity.',
        status: 500,
        why: error instanceof Error ? error.message : String(error),
      });
    }
  });

export const Route = createFileRoute('/path')({
  component: Component,
  loader: async () => await getData(),
});
```

- `.inputValidator()` for request validation, `.handler()` for logic.
- `createError()` from `@/lib/logging/evlog` for structured errors (`message`, `status`, `why`, `fix`, `cause`).
- Log with `log.info()` using `action`/`outcome` structure.
- Route `loader` for SSR data fetching. Client-side mutation: call server function, then `void router.invalidate()`.
- TanStack Query is installed for client-side fetching but most routes use loaders directly.
- `@tanstack/react-form` is used for forms with ArkType validation.

### Module Organization

`src/modules/` contains domain-specific code:

- **auth** — Better Auth middleware, generated schema (do not edit), email templates (React Email), email rendering/sending service
- **finance** — Core domain schema (accounts, transactions, categories, payees, imports, debt strategies, promotions, recurring rules, etc.)
- **todos** — Minimal example module

Each module owns its Drizzle schema. All schemas are re-exported through `src/db/schema.ts` (the aggregator).

### Database Conventions

- All monetary values are stored as **integer cents** (`amountCents`, `balanceCents`)
- All finance tables use an `auditFields` mixin: `createdById`, `updatedById`, `deletedById`, `createdAt`, `updatedAt`, `deletedAt` (soft-delete pattern)
- UUIDv7 primary keys throughout
- Column casing normalized to `snake_case` via Drizzle config
- Use implicit column names; chain order: `primaryKey` → `notNull` → `unique` → `default` → `references` → `.$onUpdate`
- Use `timestamp({ withTimezone: true })` for time columns; place them at the end of table definitions
- ArkType validation schemas are auto-generated from every table via `drizzle-arktype` (`createSelectSchema`, `createInsertSchema`, `createUpdateSchema`)
- Cascade policy: `onDelete: 'cascade'` for child records (sessions), `onDelete: 'set null'` for audit fields, soft deletes for core domain data
- Always include `.where()` for `db.update()` and `db.delete()` — prefer soft deletes over hard deletes
- Add composite indexes for hot query paths; use partial indexes for soft-delete filtering (`deleted_at IS NULL`)

See `docs/development/database.md` for full examples and schema derivation patterns.

### Auth Guard

Auth is not global — `authMiddleware` from `src/modules/auth/middleware.ts` is applied at the `_app/` layout route level. All authenticated routes live under `_app/` and inherit the guard automatically — do not apply `authMiddleware` per-route. Public routes live under `_auth/` (login, signup, reset password) or `_public/`.

### Logging (evlog)

Server-side: `log.info/warn/error()` from `@/lib/logging/evlog`. Creates request-scoped wide events via the evlog Nitro module. Events drain to SigNoz via OTLP with batching, retry, and buffer capping (configured in `src/lib/logging/drain.ts`).

`useLogger(event)` and `log.set()` are **not available** inside `createServerFn` handlers — pass a full context object in one `log.info()` call instead. Use `createError()` for errors with actionable context (`message`, `status`, `why`, `fix`).

Client-side: `clientLog` from `@/lib/logging/client-logger.ts`. Controlled by `VITE_CLIENT_LOGGING_ENABLED` and `VITE_CLIENT_LOG_LEVEL`. No PII in client logs — only UX state and feature flags.

Security: allowlist-only fields (never spread full objects), hash all user/entity IDs via `hashId()` from `@/lib/logging/hash`, mask emails, never log passwords/tokens/cookies/secrets/session IDs.

Audit logging is required for all auth actions and finance CRUD operations. Audit events are never sampled. See `docs/development/logging.md` for the full audit event list and wide event schema.

### i18n (Paraglide)

Cookie-first (`APP_LOCALE`) → browser preference → `en-US` fallback. Locale-aware formatting utilities in `src/lib/i18n.ts` (`formatCurrency`, `formatNumber`, `formatDate`, etc.). Monetary display always divides cents by 100.

### UI Components

`src/components/ui/` — Extended shadcn/ui library (style: `base-nova` — Base UI variant, not Radix). New components use `render` prop / `mergeProps`, not `asChild`. Icon library: Lucide. Component authoring guide at `docs/development/components/`. Notable additions beyond standard primitives:

- **Field system** (`field.tsx`) — Form field anatomy with `data-slot` attributes: `FieldSet`, `FieldGroup`, `Field` (vertical/horizontal/responsive), `FieldLabel`, `FieldTitle`, `FieldDescription`, `FieldError` (deduped). Uses CVA for variants.
- **InputGroup** (`input-group.tsx`) — Composition-based input wrapper: `InputGroup`, `InputGroupAddon` (4-direction alignment), `InputGroupButton`, `InputGroupText`, `InputGroupInput`.
- **Filters** (`filters.tsx`) — Full context-based filter UI with 28 operators, field types (select/multiselect/text/custom), validation, keyboard nav, search highlighting. Use `createFilter()` / `createFilterGroup()` — do not rebuild.
- **DataGrid** (`data-grid/`) — Full TanStack Table wrapper with sorting, filtering, column visibility, resizable columns, DnD rows, pagination, skeleton loading. Uses context-based composition.
- **Advanced inputs** — autocomplete, combobox (cmdk), phone input, date-selector, number-field, input-otp
- **Layout** — sidebar (collapsible), resizable panels, sortable (dnd-kit)

Styling pattern: CVA (class-variance-authority) for variant definitions + `cn()` from `@/lib/utils` for merging Tailwind classes.

### Validation

ArkType is used everywhere: env validation (`arkenv`), DB schema validation (`drizzle-arktype`), and runtime validation. Not Zod.

### Shared Utilities & Hooks

Utilities in `src/lib/`:

- `cn()` from `@/lib/utils` — Tailwind class merging (clsx + tailwind-merge). Use for all conditional styling.
- `createClientCookies()` / `createServerCookies()` from `@/lib/cookies` — Cookie helpers with `serializeServerCookie()` and `appendSetCookieHeaders()`.
- `appConfig` from `@/configs/app` — App-wide constants (name, etc.).

Hooks in `src/hooks/`:

- `useFileUpload()` — File management with drag-and-drop, validation (maxSize, accept, maxFiles), preview generation, duplicate detection, and error handling. Returns `[state, actions]`.
- `useIsMobile()` — Responsive breakpoint hook (768px). Returns `boolean`.

### Key Config Files

- `vite.config.ts` — Plugin chain: devtools → tsconfig paths → arkenv → tailwindcss → tanstackStart → nitro → react → paraglide. Also configures Nitro modules (evlog) and plugins (drain).
- `drizzle.config.ts` — Points at `src/db/schema.ts` aggregator, snake_case, migrations in `./drizzle/`
- `components.json` — shadcn/ui config pointing to `src/components/ui/`
- `lefthook.yml` — Git hooks: `pre-commit` (parallel: typecheck, lint, lint-md, format) and `commit-msg` (commitlint). Auto-fixes staged files via `stage_fixed: true`

## Task Tracking (Trekker)

- This project uses Trekker for local task tracking. The `.trekker/` directory is gitignored.
- If `.trekker/` doesn't exist, run `trekker init` to create it.
- Use the `trekker` skill (`/trekker`) for full command reference and workflow guidance.
- Use `--toon` flag on all trekker commands to reduce token usage.
- Before starting work, run `trekker ready` to find unblocked tasks.
- Set tasks to `in_progress` before working, `completed` when done.
- Add a summary comment before completing a task.
- Search before creating to avoid duplicates: `trekker search "keyword"`.

## Notes

- Canonical domain: `finance.oakoss.dev` (.com redirects to .dev).
- OAuth apps are separate for local vs prod.
