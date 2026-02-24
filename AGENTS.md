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
pnpm dev
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

Vitest config: `vitest.config.ts` (separate from `vite.config.ts`).
Test setup: `test/setup.ts`.
Vitest globals are enabled (`describe`, `it`, `expect` — no imports needed).

E2E tests are scaffolded in CI but not configured yet.

### Database

```bash
pnpm docker:up
pnpm db:generate
pnpm db:migrate
```

Better Auth schema generation (after auth config changes):

```bash
pnpm schema:auth
```

## Code Style

### Formatting & Linting

- Prettier is required (`pnpm format`).
- ESLint is strict (`pnpm lint` must be clean, max warnings = 0).
- Markdown lint is enforced (`pnpm lint:md`).

### Imports

- Prefer absolute imports via `@/`.
- **Avoid barrel files**; import directly from module paths.
- `simple-import-sort` enforces import ordering.
- No parent relative imports (`import-x/no-relative-parent-imports`).

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
- Auth middleware available at `src/modules/auth/middleware.ts` (per-route use).
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

- `_auth/` — Pathless layout route (underscore prefix = invisible URL segment) wrapping auth pages in a centered card
- `api/auth/$.ts` — Splat route handing all `/api/auth/*` to Better Auth's handler
- `demo/` — Demo/example routes (dashboard, drizzle CRUD, auth flow)

### Data Flow Pattern

Server functions are the primary data access layer:

```ts
const getData = createServerFn({ method: 'GET' }).handler(async () => {
  return await db.query.table.findMany();
});

export const Route = createFileRoute('/path')({
  loader: async () => await getData(),
});
```

Route `loader` for SSR data fetching. TanStack Query is installed and configured for client-side fetching but most routes currently use loaders directly.

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
- ArkType validation schemas are auto-generated from every table via `drizzle-arktype` (`createSelectSchema`, `createInsertSchema`, `createUpdateSchema`)

### Auth Guard

Auth is not global — `authMiddleware` from `src/modules/auth/middleware.ts` is applied per-route. It checks the session server-side and redirects to `/login` if unauthenticated.

### Logging (evlog)

Server-side: `log.info/warn/error()` from `@/lib/logging/evlog`. Creates request-scoped wide events via the evlog Nitro module. Events drain to SigNoz via OTLP with batching, retry, and buffer capping (configured in `src/lib/logging/drain.ts`).

Client-side: `clientLog` from `@/lib/logging/client-logger.ts`. Controlled by `VITE_CLIENT_LOGGING_ENABLED` and `VITE_CLIENT_LOG_LEVEL`.

User IDs in logs are HMAC-hashed via `hashId()` from `src/lib/logging/hash.ts`. Sensitive fields are recursively redacted by `src/lib/logging/sanitize.ts`.

### i18n (Paraglide)

Cookie-first (`APP_LOCALE`) → browser preference → `en-US` fallback. Locale-aware formatting utilities in `src/lib/i18n.ts` (`formatCurrency`, `formatNumber`, `formatDate`, etc.). Monetary display always divides cents by 100.

### UI Components

`src/components/ui/` — Extended shadcn/ui library. Notable additions beyond standard primitives:

- **DataGrid** (`data-grid/`) — Full TanStack Table wrapper with sorting, filtering, column visibility, resizable columns, DnD rows, pagination, skeleton loading. Uses context-based composition.
- **Advanced inputs** — autocomplete, combobox (cmdk), phone input, date-selector, number-field, input-otp
- **Layout** — sidebar (collapsible), resizable panels, sortable (dnd-kit)

### Validation

ArkType is used everywhere: env validation (`arkenv`), DB schema validation (`drizzle-arktype`), and runtime validation. Not Zod.

### Key Config Files

- `vite.config.ts` — Plugin chain: devtools → tsconfig paths → arkenv → tailwindcss → tanstackStart → nitro → react → paraglide. Also configures Nitro modules (evlog) and plugins (drain).
- `drizzle.config.ts` — Points at `src/db/schema.ts` aggregator, snake_case, migrations in `./drizzle/`
- `components.json` — shadcn/ui config pointing to `src/components/ui/`
- `lefthook.yml` — Git hooks for lint, format-check, typecheck on pre-commit/pre-push

## Notes

- Canonical domain: `finance.oakoss.dev` (.com redirects to .dev).
- OAuth apps are separate for local vs prod.
