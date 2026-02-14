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
```

Run a single test (Vitest):

```bash
pnpm test -- -t "test name"
```

Run a single file:

```bash
pnpm test -- path/to/file.test.ts
```

E2E tests are scaffolded in CI but not configured yet.

Plan: add unit and E2E tests; keep commands in `package.json` in sync with CI.

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

Copy `.env.example` to `.env`.
Key groups:

- Better Auth: `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `PASSWORD_MIN_LENGTH`, `TRUSTED_ORIGINS`
- DB: `DATABASE_URL`
- Brevo: `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `EMAIL_REPLY_TO`
- OAuth: `GITHUB_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`

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

## Cursor / Copilot Rules

- No `.cursorrules` or `.cursor/rules/*` found.
- No `.github/copilot-instructions.md` found.

## Notes

- Canonical domain: `finance.oakoss.dev` (.com redirects to .dev).
- OAuth apps are separate for local vs prod.
