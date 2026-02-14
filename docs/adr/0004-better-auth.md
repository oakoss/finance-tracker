# ADR 0004: Use Better Auth

Date: 2026-02-13
Status: Accepted

## Context

We want authentication that:

- Works with TanStack Start
- Supports email/password, sessions, verification, reset password
- Supports OAuth (GitHub, Google) with account linking
- Can persist to the same DB via Drizzle

## Decision

Use Better Auth for authentication and session management, including OAuth and account linking.

## Alternatives Considered

- Auth.js
- Clerk / hosted auth
- Custom sessions/JWT

## Consequences

- Positive: Self-hostable; integrates with Drizzle; flexible feature set.
- Negative: We must correctly set base URL and cookie behavior behind Cloudflare Tunnel.
- Follow-ups: Define Better Auth base URL strategy for public HTTPS + internal HTTP and keep OAuth callbacks aligned with the canonical domain.
