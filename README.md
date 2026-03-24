# Finance Tracker

[![CI](https://github.com/oakoss/finance-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/oakoss/finance-tracker/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Full-stack personal finance app built with TanStack Start (React 19),
Nitro v3, PostgreSQL/Drizzle, Better Auth, Tailwind CSS v4/shadcn (Base UI),
ArkType, and Paraglide i18n.

## Getting Started

### Install dependencies

```bash
pnpm install
```

### Run the app

```bash
pnpm docker:up    # PostgreSQL + Mailpit
pnpm db:migrate
pnpm dev
```

### Build

```bash
pnpm build
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.
See `docs/development/env.md` for full details.

### Auth

- `BETTER_AUTH_URL` (prod: `https://finance.oakoss.dev`, local: `http://localhost:3000`)
- `BETTER_AUTH_SECRET` (min 32 chars)
- `TRUSTED_ORIGINS` (comma-separated allowed origins)
- Password minimum length: 8 characters (configured in `appConfig.passwordMinLength`)

### Database

- `DATABASE_URL`

### Email

Local dev uses SMTP via Mailpit (`SMTP_HOST`, `SMTP_PORT`).
Production uses the Brevo API (`BREVO_API_KEY`).

- `EMAIL_FROM` (recommended: `no-reply@finance.oakoss.dev`)
- `EMAIL_FROM_NAME` (recommended: `Finance Tracker`)
- `EMAIL_REPLY_TO` (recommended: `support@finance.oakoss.dev`)

### OAuth

- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`

### Optional

- `POSTHOG_API_KEY` / `POSTHOG_HOST` — server-side analytics
- `VITE_PUBLIC_POSTHOG_KEY` / `VITE_PUBLIC_POSTHOG_HOST` — client-side analytics
- `OTEL_EXPORTER_OTLP_ENDPOINT` — OpenTelemetry export
- `LOG_HASH_SECRET` — PII hashing in logs
- `VITE_CLIENT_LOG_LEVEL` — client log level (default: `warn`)

## Contributing

See `docs/CONTRIBUTING.md` for local DB setup, auth schema generation,
and workflow scripts.

## CI & Automation

- GitHub Actions workflows: `ci.yml`, `codeql.yml`, `dependency-review.yml`
- Composite actions: `ci-prepare`, `setup`, `static-analysis`
- Renovate config: `.github/renovate.json`

## Project Structure

- `src/modules/` — feature modules (accounts, auth, budgets, categories,
  debt, imports, preferences, promotions, rules, statements, transactions,
  transfers)
- `src/db/schema.ts` — aggregator for Drizzle schemas
- `src/routes/` — TanStack Router routes
- `docs/` — architecture, code standards, testing, and other guides

## Notes

- Canonical domain: `finance.oakoss.dev` (`.com` redirects to `.dev`).
- Use separate OAuth apps for local vs prod.
