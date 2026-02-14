# ADR 0007: Use PostgreSQL as primary database

Date: 2026-02-13
Status: Accepted

## Context

We need a database for:

- Users/sessions (Better Auth)
- Finance entities (accounts, categories, transactions)
- Reporting queries over time

The deployment target (Coolify) has first-class Postgres support.

## Decision

Use PostgreSQL as the primary database.

## Alternatives Considered

- SQLite (file-based)
- MySQL/MariaDB

## Consequences

- Positive: Strong querying/indexing for reporting; good operational story on Coolify; Drizzle supports it well.
- Negative: Slightly more operational overhead than SQLite.
- Follow-ups: Decide amount storage format (integer cents vs `numeric`) and define initial indices for transaction queries.
