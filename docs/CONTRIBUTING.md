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
2. Fill in required values. See `docs/development/env.md` for details.

## Database

```bash
pnpm docker:up
```

Generate Better Auth schema after auth config changes (see
`docs/development/auth.md`):

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

See `docs/development/auth.md` for auth configuration and files.

## Conventions

See `docs/development/code-standards.md` for detailed conventions.
See `docs/development/workflows.md` for CI details.

## Git Workflow

We use GitHub Flow:

- Create a feature branch from `main`.
- Open a PR back into `main`.
- Required checks: CI (`static-analysis`) and Dependency Review.

## Workflows

See `docs/development/workflows.md` for workflow conventions and details.

## Code Standards

See `docs/development/code-standards.md` for style and conventions.
