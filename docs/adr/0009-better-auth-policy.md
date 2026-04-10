# ADR 0009: Better Auth Policy Settings

Date: 2026-02-14
Status: Accepted (revised 2026-04-10 — see Revisions)

## Context

We need consistent authentication behavior across environments with strong defaults for a finance app (email verification, rate limiting, trusted origins, account linking policy).

## Decision

- Email verification is a **soft gate**: users can sign in and read
  their data without verifying, but finance mutations are blocked
  until they do. Self-service flows stay open so an unverified user
  is never trapped and can always leave, export, or fix a typo'd
  email. The authoritative allowlist of exempt endpoints lives in
  `src/modules/auth/middleware-chain.test.ts`;
  `verifiedMutationMiddleware` in `src/modules/auth/middleware.ts`
  enforces the gate.
- Enable change-email and custom delete-account flows (with
  verification emails).
- Enable OAuth (GitHub + Google) and account linking with
  email/password as the last fallback.
- Set trusted origins via `TRUSTED_ORIGINS`.
- Enable rate limiting in production.
- Encrypt OAuth tokens at rest in production.
- Use `tanstackStartCookies` for proper cookie handling.

## Alternatives Considered

- **Hard gate** (block sign-in entirely until verified): originally
  chosen, then rejected. A typo'd email traps the user with no
  recovery path short of password reset. The hard gate also made E2E
  tests painful because every seeded user had to either click a
  magic link or be patched directly in the DB.
- Allow unlinking all providers (risk of lockout).
- Disable rate limiting (risk of abuse).
- Gate every mutation including deletion and export: rejected
  because it conflicts with GDPR Article 17 / Article 20 — users
  must always be able to erase or export their data.

## Consequences

- Positive: Unverified users can't write finance data, typo'd
  emails are recoverable via change-email, and verified users see
  the full app on first load.
- Negative: Slightly more setup (trusted origins, email sender).
  Two middleware types (`authMiddleware`, `verifiedMutationMiddleware`)
  instead of one; each mutation file has to pick the right one.
- Follow-ups: Revisit session duration and add org/household plugin
  post-MVP.

## Revisions

- **2026-02-27 (TREK-111)** — Flipped `requireEmailVerification` to
  `false` in Better Auth config so E2E sign-up could complete
  without clicking a magic link. Left follow-up TREK-114 for the
  replacement gate.
- **2026-04-10 (TREK-114)** — Replaced the hard verification gate
  with the soft gate described above. Custom
  `verifiedMutationMiddleware` enforces it on finance writes.
