# Security

Project security notes and expectations.

## Secrets

- Use `.env.local` for local development.
- Do not commit secrets.

## Auth

- Trusted origins are enforced via `TRUSTED_ORIGINS`.
- Rate limiting is enabled in production.
- OAuth tokens are encrypted at rest in production.

## Content Security Policy

- Consider adding a CSP once public pages are ready.
- Start with `report-only` and tighten over time.

## Cloudflare

- `cf-connecting-ip` is used for IP detection.
