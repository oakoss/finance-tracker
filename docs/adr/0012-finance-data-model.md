# ADR 0012: Finance Data Model (Ledger Accounts + Promos)

Date: 2026-02-15
Status: Accepted

## Context

We need a flexible, future-ready data model that supports manual entry, CSV imports, credit card promos, and debt payoff strategies while keeping MVP complexity manageable.

## Decision

- Use `ledger_accounts` as the core account table (checking, savings, credit cards, loans).
- Store money as integer cents and timestamps as `timestamptz`.
- Track credit card promos via `promotions`, `promo_buckets`, and `promo_bucket_transactions` to separate promo vs non-promo balances.
- Track import provenance via `imports` and `import_rows` with dedupe fingerprinting.
- Keep audit + soft delete fields on all finance tables; log history in `audit_logs`.

## Alternatives Considered

- Separate tables for credit cards vs bank accounts.
- Simple promo windows without bucket allocation.
- No import provenance (risk of duplicate data and limited auditability).

## Consequences

- Positive: Flexible account modeling, accurate promo balance tracking, better auditability.
- Negative: More tables and joins compared to a minimal MVP schema.
- Follow-ups: Add helper utilities for audit logging and soft-delete filtering.
