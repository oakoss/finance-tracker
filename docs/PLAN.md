# Finance Tracker - Plan

This document captures the current decisions, open questions, and near-term plan for the finance tracker web application.

For durable decision records (the "why" behind choices), see `docs/adr/`.

Supporting docs:

- `docs/development/code-standards.md`
- `docs/development/workflows.md`
- `docs/CONTRIBUTING.md`
- `docs/development/auth.md`
- `docs/development/database.md`
- `docs/development/security.md`
- `docs/development/testing.md`

## Stack (Current Direction)

- Framework: TanStack Start (TanStack Stack)
- UI: shadcn-style components, using the base-ui variant
- ORM: Drizzle
- Auth: Better Auth
- Email: React Email templates + Brevo delivery
- Deployment target: Coolify
- Ingress: Cloudflare Tunnel (Cloudflare terminates TLS)
- CI: GitHub Actions (custom setup + static-analysis actions)
- Dependency automation: Renovate (monthly cadence, automerge for non-major updates)

## Hosting / Deployment Notes (Coolify + Cloudflare Tunnel)

- Coolify deployments run as Docker containers.
- Build approach options:
  - Nixpacks (Coolify default): Coolify generates a Dockerfile and builds automatically from the repo.
  - Dockerfile build pack: we provide a Dockerfile for full control (Node version, build steps, etc.).

Cloudflare Tunnel specifics:

- With Cloudflare Tunnel, it is common to configure application domains in Coolify as `http://...` (Cloudflare provides external HTTPS).
- If the app requires HTTPS at the origin for cookies/auth flows, we may need the Coolify "Full HTTPS/TLS" tunnel setup.
- Multiple domains can be handled by adding additional public hostnames in the same tunnel. Wildcard hostnames can reduce per-app hostname setup.

## Domain Implementation Notes

See:

- `docs/development/auth.md`
- `docs/development/database.md`
- `docs/development/security.md`
- `docs/development/testing.md`

## Domains

Canonical domain:

- `finance.oakoss.dev`

Redirects:

- `.com` should redirect to `.dev`

Important for auth:

- Better Auth base URL should match the public HTTPS URL users access (even if origin is HTTP behind the tunnel).

## MVP Scope (Initial)

- Auth: sign up, sign in, sign out, email verification, reset password
- Accounts: create/list accounts
- Categories: income/expense categories
- Transactions: add/edit/delete; list with filters (date range, account, category)
- Dashboard: current month income/expense totals; category breakdown

## Suggested Initial Data Model (High-Level)

- Users
- Accounts (name, type, currency)
- Categories (name, kind: income|expense)
- Transactions (date, description, amount, accountId, categoryId)

Later:

- Tags + transaction_tags
- Recurring transactions
- Budgets

## Open Questions

- Coolify build approach: Nixpacks-only vs include a Dockerfile now
- Cloudflare tunnel mode: "All resources" (proxy to localhost:80) vs "Single resource" (port mapping)
- Amount storage: integer cents vs Postgres numeric

## ADR Index

- `docs/adr/0001-tanstack-start.md`
- `docs/adr/0002-base-ui-shadcn.md`
- `docs/adr/0003-drizzle-orm.md`
- `docs/adr/0004-better-auth.md`
- `docs/adr/0005-email-react-email-and-brevo.md`
- `docs/adr/0006-deployment-coolify-cloudflare-tunnel.md`
- `docs/adr/0007-database-postgres.md`
- `docs/adr/0008-auth-ids-uuidv7-nanoid.md`
- `docs/adr/0009-better-auth-policy.md`
- `docs/adr/0010-database-conventions.md`
- `docs/adr/0011-ci-and-renovate.md`

## Next Implementation Steps

1. Run Better Auth schema generation after config changes
2. Run Drizzle migrations
3. Implement auth UI pages (sign in / sign up / reset)
4. Implement core domain models (accounts, categories, transactions)
5. Add deployment artifacts (at least documentation; optionally a Dockerfile)
6. Create GitHub repo and enable Actions + Advanced Security + Renovate
7. Enable CodeQL workflow once Advanced Security is enabled
