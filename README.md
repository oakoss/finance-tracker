# Finance Tracker

[![CI](https://github.com/oakoss/finance-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/oakoss/finance-tracker/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Getting Started

### Install dependencies

```bash
pnpm install
```

### Run the app

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values.

### Better Auth

- `BETTER_AUTH_URL` (prod: `https://finance.oakoss.dev`, local: `http://localhost:3000`)
- `BETTER_AUTH_SECRET` (min 32 chars)
- `PASSWORD_MIN_LENGTH` (dev: `8`, prod: `12`)

### Database

- `DATABASE_URL`

### Brevo

- `BREVO_API_KEY`
- `EMAIL_FROM` (recommended: `no-reply@finance.oakoss.dev`)
- `EMAIL_FROM_NAME` (recommended: `Finance Tracker`)
- `EMAIL_REPLY_TO` (recommended: `support@financial.oakoss.dev`)

### OAuth

- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`

## Contributing

See `docs/CONTRIBUTING.md` for local DB setup, auth schema generation, and workflow scripts.

## CI & Automation

- GitHub Actions workflow: `.github/workflows/ci.yml`
- Composite actions: `.github/actions/setup`, `.github/actions/static-analysis`
- Renovate config: `.github/renovate.json`

## Project Structure

- `src/modules/*` feature modules
- `src/db/schema.ts` aggregator for Drizzle schemas
- `src/routes` TanStack Router routes

## Notes

- `.com` should redirect to `.dev` (canonical domain is `finance.oakoss.dev`).
- Use separate OAuth apps for local vs prod.
