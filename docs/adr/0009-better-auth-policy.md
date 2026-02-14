# ADR 0009: Better Auth Policy Settings

Date: 2026-02-14
Status: Accepted

## Context

We need consistent authentication behavior across environments with strong defaults for a finance app (email verification, rate limiting, trusted origins, account linking policy).

## Decision

- Require email verification for email/password.
- Enable change-email and delete-user flows (with verification emails).
- Enable OAuth (GitHub + Google) and account linking with email/password as the last fallback.
- Set trusted origins via `TRUSTED_ORIGINS`.
- Enable rate limiting in production.
- Encrypt OAuth tokens at rest in production.
- Use `tanstackStartCookies` for proper cookie handling.

## Alternatives Considered

- Optional email verification (lower security).
- Allow unlinking all providers (risk of lockout).
- Disable rate limiting (risk of abuse).

## Consequences

- Positive: Stronger security defaults and consistent auth behavior.
- Negative: Slightly more setup (trusted origins, email sender).
- Follow-ups: Revisit session duration and add org/household plugin post-MVP.
