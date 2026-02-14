# ADR 0010: Database Conventions

Date: 2026-02-14
Status: Accepted

## Context

We need consistent schema conventions across modules for auditing, soft deletes, and time zone handling.

## Decision

- Use `timestamptz` for all timestamp columns (UTC storage).
- Standard columns: `createdAt`, `updatedAt`, `deletedAt` (soft deletes).
- Audit columns: `createdById`, `updatedById`, `deletedById`.
- Prefer integer cents for money storage (or `numeric` if required).

## Alternatives Considered

- `timestamp without time zone` (risk of inconsistent time handling).
- Hard deletes only (no audit trail).

## Consequences

- Positive: Consistent auditing and time handling across modules.
- Negative: Slightly more column overhead and care when querying soft deletes.
- Follow-ups: Add helper utilities for soft-delete filtering.
