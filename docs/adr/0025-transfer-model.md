# ADR 0025: Transfers as Linked Transaction Pairs

Date: 2026-04-13
Status: Accepted

## Context

The `transfers` table today (`src/modules/transfers/db/schema.ts`)
stores one row per transfer with its own `amountCents`,
`transferAt`, `fromAccountId`, and `toAccountId`. But an actual
transfer on the ledger is two transactions: a debit on the source
account and a credit on the destination. If we keep the current
model, the amount and date live in two places (the `transfers` row
and the two `transactions` rows a user eventually records). Drift
is inevitable the first time someone edits a transaction.

There is also a practical mismatch: every inbound path produces
transactions first (CSV import, manual entry, future sync). The
transfer is a relationship between two of those rows, not a
parallel record.

## Decision

- Model a transfer as a relationship between two existing
  `transactions` rows.
- Replace `amountCents`, `transferAt`, `fromAccountId`,
  `toAccountId`, and `memo` on `transfers` with:
  - `fromTransactionId` (FK → `transactions.id`, required)
  - `toTransactionId` (FK → `transactions.id`, required)
  - `detectedByRuleId` (FK → rule, nullable — set when auto-detected)
  - `confidence` (enum: `manual`, `high`, `medium`, `low` — for
    auto-detection review flows)
- Keep `userId`, `id`, `auditFields`. Drop `memo` — the underlying
  transactions already carry their own.
- **Drop the existing `transactions.transferId` column** (currently
  a nullable FK → `transfers.id` at
  `src/modules/transactions/db/schema.ts:98`) and its accompanying
  index `transactions_transfer_id_idx`. The new pair table is the
  single source of truth; a column on `transactions` that points
  back at `transfers.id` duplicates the link and forces every
  consumer (UI badges, CSV export, budget aggregation) to decide
  which side to trust. Callers that need "is this transaction part
  of a transfer?" query the `transfers` table directly (or a
  denormalized view if perf requires).
- Enforce via CHECK constraint: `fromTransactionId != toTransactionId`.
- Amount, date, account, and currency are derived from the two
  linked transactions. Cross-currency transfers work naturally
  because each leg has its own account and amount.
- The `transfers` row is a marker that excludes the pair from
  spending totals and surfaces the pair as "a transfer" in the UI.

## Alternatives Considered

- **Keep the standalone row (current).** Rejected — duplicates
  amount/date and invites drift when transactions change.
- **No `transfers` table at all; mark transactions with a
  `isTransfer` boolean + `pairTransactionId` self-FK.** Rejected
  because transfer-level metadata (detection confidence, rule
  provenance, user confirmation state) has nowhere clean to live,
  and self-joins on transactions for pair lookup are less
  discoverable than a dedicated join table.
- **Hybrid — keep duplicated amount/date on `transfers` plus
  transaction links.** Rejected — all the drift risk of the
  current model with none of the benefit.
- **One `transfers` row, many legs (N:M).** Rejected — real-world
  transfers are always 1:1.

## Consequences

- **Positive**: the ledger is the source of truth; no drift.
  Cross-currency transfers work without extra columns. Auto-
  detection has a natural place to record provenance and
  confidence.
- **Positive**: "exclude transfer pair from budget totals" becomes
  a simple join (`budgets` aggregation SQL filters transactions
  whose id is in either column of an active transfer row).
- **Negative**: the `transfers` module can't ship before the
  `transactions` table has the columns it needs today (it already
  does — no new columns required on `transactions` for this).
- **Negative**: the previous schema's direct `fromAccountId`
  convenience is gone. Any UI that wants "source account" reads
  through the linked transaction, which is one extra join. The
  cost is small given the existing relations.
- **Negative**: fee-carrying transfers (Wise, Revolut, brokerage
  sweeps) lose the "intended principal" vs. "fee" distinction
  unless modeled as a third transaction or a separate metadata
  column. The two-transaction model captures what actually hit
  each account but not the user's intent. Revisit if users
  complain; for v1, document that transfer fees are best
  recorded as a separate expense transaction.
- **Follow-ups**: the transfers spec (`docs/specs/0004-transfers-module.md`)
  describes the manual-create flow, auto-detection heuristic, and
  review queue that rely on this shape. No prod data exists to
  migrate; the schema change lands at spec implementation time.
