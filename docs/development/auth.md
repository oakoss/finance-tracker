# Auth

Better Auth is the authentication system for this app.

See:

- `docs/adr/0004-better-auth.md` for the library choice.
- `docs/adr/0009-better-auth-policy.md` for policy defaults.
- `docs/development/emails.md` for email templates and styling.

## Key Files

- `src/lib/auth.ts`
- `src/lib/auth-client.ts`
- `src/routes/api/auth/$.ts`
- `src/modules/auth/middleware.ts`

## Features

Auth features and policy decisions are defined in
`docs/adr/0009-better-auth-policy.md`.

## Auth Guard

Auth is not global -- protection is applied at the `_app/` layout
route level via `beforeLoad`:

1. Calls `getSession()` server function.
2. Redirects unauthenticated users to `/login` with
   `?redirect=location.href`. On login, the value is checked to start
   with `/` but not `//` before navigating (same-origin only).
3. Passes `session` to route context.

All authenticated routes live under `_app/` and inherit the guard.
Child routes access the session via `Route.useRouteContext()`.

The `_auth/` layout includes a **reverse guard** -- authenticated
users are redirected to `/dashboard`. Resilient to auth infrastructure
failures (falls through to show the auth page).

## Auth Middleware

`authMiddleware` (`src/modules/auth/middleware.ts`) provides session
context to server functions via middleware chaining. Passes session via
`next({ context: { session } })`. On infrastructure failure, defaults
to `session: null`.

## Security Notes

Security expectations are documented in `docs/development/security.md`.

## Schema Generation

Run after auth config changes:

```bash
pnpm schema:auth
```

Do not edit `src/modules/auth/db/schema.ts` manually.
