---
paths:
  - src/lib/logging/**/*
---

# Logging Rules

- Use `log.info()`, `log.warn()`, `log.error()`, `log.debug()` from `@/lib/logging/evlog`. Never use `console`.
- `useLogger(event)` and `log.set()` are **not available** inside `createServerFn` handlers — pass a full context object in one `log.info()` call instead.
- Never call `log.emit()` manually — the evlog Nitro module handles it per request.
- Use `createError()` from `@/lib/logging/evlog` for errors with actionable context (`message`, `status`, `why`, `fix`).

## Security

- **Allowlist only** — log explicit fields; never spread full objects.
- **Never log**: passwords, tokens, cookies, secrets, session IDs, raw request bodies.
- **Mask emails**: only log partial form (e.g., `j***@example.com`).
- **Hash IDs**: always use `hashId()` from `@/lib/logging/hash` for user and entity IDs — never raw IDs.
- **Uploads**: log only metadata (size, MIME type) — never file content or raw filenames.

## Audit events

Audit logging is required for auth actions (`auth.signup`, `auth.login`, `auth.logout`, `auth.password.reset`, `auth.email.verify`) and all finance CRUD operations. Audit events must never be sampled.

See `docs/development/logging.md` for the full audit event list and wide event schema.
