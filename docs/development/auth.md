# Auth

Better Auth is the authentication system for this app.

## Key Files

- `src/lib/auth.ts`
- `src/lib/auth-client.ts`
- `src/routes/api/auth/$.ts`
- `src/modules/auth/middleware.ts`

## Features

- Email + password with required verification
- Password reset
- OAuth: GitHub + Google
- Account linking (email + OAuth)
- Change email + delete user flows

## Security Notes

- `TRUSTED_ORIGINS` is required to validate CSRF + redirects.
- Rate limiting is enabled in production (60s window, 100 requests).
- OAuth tokens are encrypted at rest in production.
- Cloudflare IP header: `cf-connecting-ip`.

## Schema Generation

Run after auth config changes:

```bash
pnpm schema:auth
```

Do not edit `src/modules/auth/schema.ts` manually.
