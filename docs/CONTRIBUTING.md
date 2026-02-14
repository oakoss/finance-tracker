# Contributing

Thanks for contributing to the Finance Tracker app! This guide covers local setup, workflow, and project conventions.

## Quick Start

```bash
pnpm install
pnpm docker:up
pnpm dev
```

## Environment Setup

1. Copy `.env.example` to `.env`.
2. Fill in all required values (Better Auth, DB, Brevo, OAuth).

## Database

```bash
pnpm docker:up
```

Generate Better Auth schema after auth config changes:

```bash
pnpm schema:auth
```

Run Drizzle migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

## Scripts

```bash
pnpm lint
pnpm format
pnpm lint:md
pnpm typecheck
pnpm build
```

## Project Structure

- `src/modules/*` feature modules
- `src/db/schema.ts` Drizzle schema aggregator
- `src/routes` TanStack Router routes

## Auth Notes

- Better Auth config lives in `src/lib/auth.ts`.
- Email templates live in `src/modules/auth/emails`.
- Brevo delivery is handled in `src/lib/email.ts`.

## Conventions

- Keep auth-related code in `src/modules/auth`.
- Run `pnpm lint:md` after docs updates.
- Avoid editing generated Better Auth schema manually.
- CI runs static analysis for all PRs with docs-only optimization.
- Avoid barrel files; prefer direct imports from module paths.

## Git Workflow

We use GitHub Flow:

- Create a feature branch from `main`.
- Open a PR back into `main`.
- Required checks: CI (`static-analysis`) and Dependency Review.

## Workflows

See `docs/development/workflows.md` for workflow conventions and details.

## Code Standards

See `docs/development/code-standards.md` for style and conventions.
