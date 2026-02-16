# ADR 0019: Cookie Management via universal-cookie

Date: 2026-02-15
Status: Accepted

## Context

We need a consistent cookie API for both client and server in TanStack Start, with minimal custom logic and good defaults.

## Decision

- Use `universal-cookie` for client/server cookie reads and writes.
- Use `cookie` for server-side `Set-Cookie` serialization.
- Provide small helpers in `src/lib/cookies.ts` for common usage.

## Alternatives Considered

- Direct `document.cookie` and manual header parsing.
- `cookie-es` for parser/serializer only.

## Consequences

- Positive: Single API and fewer hand-rolled utilities.
- Negative: Additional dependency footprint.
