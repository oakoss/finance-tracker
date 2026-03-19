# Security

Security configuration and expectations for the finance tracker.

See `docs/adr/0009-better-auth-policy.md` for the auth security policy
ADR.

## Authentication

Better Auth handles authentication with the following production
settings (configured in `src/lib/auth/server.ts`):

### Password policy

- Minimum length: 8 characters (configured in `appConfig.passwordMinLength`)
- Email verification emails sent on sign-up/sign-in but not required
  to log in (`requireEmailVerification: false`)
- Password reset tokens expire after 2 hours
- All sessions are revoked on password reset

### Sessions

- Expire after 7 days
- Fresh age: 1 day (re-authentication window)
- Update age: 1 day (token refresh interval)

### OAuth

- Providers: GitHub, Google (configured via env vars)
- OAuth tokens encrypted in production only
- Account linking: trusted providers only, same email required,
  unlinking all accounts is not allowed

### Rate limiting

- Enabled in production only
- 100 requests per 60-second window per IP
- Uses `cf-connecting-ip` header for IP detection behind Cloudflare

### Trusted origins

`TRUSTED_ORIGINS` env var (comma-separated). Required for CSRF
protection on cross-origin requests.

## Route protection

Auth is enforced at the `_app/` layout level via `beforeLoad`, not
globally. See `docs/development/auth.md` for the guard and middleware
patterns.

## Logging sanitization

- Allowlist-only fields in log events (never spread full objects)
- All user and entity IDs are hashed via HMAC-SHA256 (`hashId()`)
- Emails are masked; passwords, tokens, cookies, and session IDs are
  never logged
- See `docs/development/logging.md` for the full policy

## Content Security Policy

No CSP is configured yet. Plan:

1. Add a `report-only` CSP once public pages ship
2. Tighten directives based on violation reports
3. Switch to enforcing mode

## OWASP considerations

- SQL injection: mitigated by Drizzle ORM (parameterized queries)
- XSS: React's default escaping + future CSP
- CSRF: Better Auth's trusted origins check
- Secrets: env-only, never committed (see `docs/development/env.md`)
