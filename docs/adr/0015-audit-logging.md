# ADR 0015: Audit Logging for Domain Tables

Date: 2026-02-15
Status: Accepted

## Context

We need traceability for data changes across the finance domain to support debugging, investigations, and future compliance needs.

## Decision

- Add an `audit_logs` table that stores full before/after JSON snapshots.
- Record audit logs for all domain tables we control (finance and related modules), not for Better Auth tables.
- Keep per-row audit columns (`createdById`, `updatedById`, `deletedById`) alongside the audit log for fast access to current metadata.

## Alternatives Considered

- Only store per-row audit fields (no historical log).
- Log only financial tables instead of all domain tables.
- Store diffs instead of full snapshots.

## Consequences

- Positive: Full history for forensic debugging and future compliance.
- Negative: Additional storage and write overhead.
- Follow-ups: Add helper utilities to write audit logs consistently and consider retention policies.
