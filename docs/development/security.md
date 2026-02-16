# Security

Project security notes and expectations.

## Secrets

- Use `.env` for local development.
- Do not commit secrets.

## Auth

See `docs/adr/0009-better-auth-policy.md` for auth security policy details.

## Content Security Policy

- Consider adding a CSP once public pages are ready.
- Start with `report-only` and tighten over time.

## Cloudflare

- `cf-connecting-ip` is used for IP detection.
