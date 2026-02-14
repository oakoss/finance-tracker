# ADR 0001: Use TanStack Start

Date: 2026-02-13
Status: Accepted

## Context

We want a modern full-stack web app with:

- SSR-capable routing and server functions
- Strong TypeScript ergonomics
- A stack that pairs well with Drizzle and Better Auth
- Deployability to Coolify (container-based)

## Decision

Use TanStack Start as the application framework.

## Alternatives Considered

- Next.js
- Remix
- SvelteKit

## Consequences

- Positive: One cohesive TanStack-centric architecture; strong type-safety patterns.
- Negative: Smaller ecosystem vs Next.js; fewer off-the-shelf examples.
- Follow-ups: Confirm runtime (Node) and ensure server listens on `0.0.0.0:$PORT` for container deployments.
