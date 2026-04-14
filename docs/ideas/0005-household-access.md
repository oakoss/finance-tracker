# Idea 0005: Household / Multi-User Access

Status: exploring
Date: 2026-04-14
Related: EPIC-27 (already tracked in Trekker)

## What

Let two or more users share a single ledger: both see the same
accounts, transactions, budgets, and net worth. Magic-link invite
flow (Copilot's model) avoids forcing the partner through a full
signup. Per-user attribution on transactions ("who created this")
remains via the existing `auditFields`.

## Why

Research 0005 (Copilot Money) notes that shared household access
is included in Copilot's base plan; Monarch charges extra for it.
Research and user asks have both flagged this as a differentiator
for couples who share finances.

Sized as an **epic-level design pass**, not a single spec. Schema
touches users, accounts, budgets, auth sessions, RLS policies,
every audit event, and the invite + access-revocation UX. Worth
an ADR on the access model (shared-ledger vs. per-user-with-sync
vs. shared-account-subset) before any spec.

## Open questions

- Access model: one ledger fully shared (Copilot) vs. per-user
  ledger with a shared view (Monarch) vs. per-account opt-in?
- Invite flow: magic-link with email verification, or
  explicit signup for the partner account?
- Permissions: read-only partner mode, or symmetric read-write?
- Audit attribution: surface "who did this" prominently or keep
  it in auditFields only?
- Billing implications for a future hosted tier.
