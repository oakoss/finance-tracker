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

## Security Notes

Security expectations are documented in `docs/development/security.md`.

## Schema Generation

Run after auth config changes:

```bash
pnpm schema:auth
```

Do not edit `src/modules/auth/schema.ts` manually.
