# ADR 0003: Use Drizzle ORM

Date: 2026-02-13
Status: Accepted

## Context

We want type-safe SQL with straightforward migrations and compatibility with Postgres (likely) and Better Auth.

## Decision

Use Drizzle as the ORM and migration toolchain.

## Alternatives Considered

- Prisma
- Kysely
- Knex

## Consequences

- Positive: Type-safe schema and queries; good fit for Postgres; lightweight.
- Negative: Some ecosystem tooling is less batteries-included than Prisma.
- Follow-ups: Choose DB engine (Postgres recommended), decide money column strategy (cents vs numeric), and keep schema aggregation in `src/db/schema.ts`.
