# Spec: Transfers Module

Status: draft
Epic: EPIC-31 (Transfers)
Date: 2026-04-13

## Context

The `transfers` module has DB scaffolding but no UI. Transfers
between the user's own accounts (checking → credit card payment,
paycheck-split savings, etc.) should not count as spending in
budgets, but the current import paths land them as two disconnected
transactions.

ADR 0025 reshapes `transfers` as a link between two existing
`transactions` rows rather than a standalone record. This spec
covers manual pairing, auto-detection, and the review queue UI.

## Scope

**In scope:**

- Schema change per ADR 0025: `fromTransactionId`,
  `toTransactionId`, `detectedByRuleId` (nullable),
  `confidence` (enum).
- Auto-detection service that runs after every import / sync batch.
- Review queue for low/medium-confidence suggestions.
- Manual create: user selects two existing transactions to pair.
- Unpair / delete transfer links.
- Transfer badge on the transactions list.
- Budget aggregation treats paired-transfer transactions as
  excluded from spending totals.

**Out of scope:**

- Cross-currency FX auto-calculation beyond what naturally falls
  out of each transaction's own account + amount.
- Merchant-agnostic detection (e.g., "Venmo cashout to bank"
  special-case logic).
- Scheduled / future-dated transfers as first-class records.
- Multi-leg transfers (intentionally 1:1 per ADR 0025).

## User flows

### Flow 1: Auto-detection on import

1. After a CSV import commit or a sync run finishes, a post-commit
   hook queues a detection pass over the affected user's recent
   transactions (e.g., last 14 days).
2. Detection pairs candidates where:
   - Two transactions belong to the user.
   - Opposite signs, same absolute amount.
   - Posted within `detectionWindowDays` of each other
     (default 3).
   - Different accounts.
3. Each candidate gets a `confidence` label:
   - `high`: exact same amount, ±1 day, accounts previously paired
     as transfers.
   - `medium`: exact amount, ±3 days, unseen account pair.
   - `low`: near-amount (within $1 to handle rounding), ±3 days.
4. `high` confidence pairs auto-link (write `transfers` row with
   `confidence = 'high'`). `medium` and `low` land in the review
   queue.

### Flow 2: Review queue

1. Transactions page shows a dismissable banner: "N possible
   transfers to review."
2. Review drawer lists candidates side-by-side. Actions: Confirm,
   Skip (dismiss for 30 days), Not a transfer (persist dismiss).
3. Confirm writes the `transfers` row with `confidence = 'manual'`
   (user-verified wins over whatever the heuristic said).
4. Skip/dismiss stores a `transfer_dismissals` row so the pair
   isn't re-suggested.

### Flow 3: Manual create from a transaction row

1. From a transaction row action menu: "Pair as transfer".
2. Picker dialog shows candidate counterparts (same user, opposite
   sign, close date). User picks one. "Find other" if none match.
3. Confirm writes the pair, refreshes the list.

### Flow 4: Unpair

1. A paired transaction shows a "transfer badge" and a row action
   "Unpair".
2. Type-to-confirm destructive action; soft-deletes the `transfers`
   row. Underlying transactions stay untouched.

## Data model

### Schema change to `transfers` (per ADR 0025)

| Column                        | Type            | Notes                                               |
| ----------------------------- | --------------- | --------------------------------------------------- |
| `id`, `userId`, `auditFields` | existing        | unchanged                                           |
| `fromTransactionId`           | uuid            | FK → `transactions.id` cascade. Required            |
| `toTransactionId`             | uuid            | FK → `transactions.id` cascade. Required            |
| `detectedByRuleId`            | uuid (nullable) | FK → future detection-rule table; always null in v1 |
| `confidence`                  | enum            | `manual`, `high`, `medium`, `low`                   |

Removed: `fromAccountId`, `toAccountId`, `amountCents`,
`transferAt`, `memo`. All derivable from the linked transactions.

### Removed column on `transactions`

Per ADR 0025: drop `transactions.transferId` (FK →
`transfers.id`) and its `transactions_transfer_id_idx`. Every
caller that currently reads `row.transferId` — transaction list
row actions, CSV/JSON export in `gather-user-data`, any pending
budget aggregation — migrates to querying `transfers` by
`fromTransactionId` / `toTransactionId`. This is a breaking
schema change the implementation task must do atomically with
the `transfers` shape change.

CHECK constraint: `from_transaction_id <> to_transaction_id`.
Pair uniqueness uses an expression index so (A,B) and (B,A) are
treated as the same pair regardless of insertion order:

```sql
CREATE UNIQUE INDEX transfers_pair_unique_idx
  ON transfers (
    LEAST(from_transaction_id, to_transaction_id),
    GREATEST(from_transaction_id, to_transaction_id)
  )
  WHERE deleted_at IS NULL;
```

Application code should still store pairs in a consistent order
for query ergonomics; the expression index catches violations
regardless. Re-pairing two transactions after an unpair
(soft-delete) is permitted because the `WHERE deleted_at IS NULL`
clause excludes soft-deleted rows from the index.

### New `transfer_dismissals` table

One row per user-dismissed candidate pair.

| Column             | Type      | Notes                                        |
| ------------------ | --------- | -------------------------------------------- |
| `id`               | uuid (v7) | PK                                           |
| `userId`           | uuid      | FK → `users.id` cascade                      |
| `txnAId`, `txnBId` | uuid      | ordered so `txnAId < txnBId` (DB convention) |
| `dismissedAt`      | timestamp | defaultNow                                   |
| `expiresAt`        | timestamp | Nullable — null means permanent              |

Unique index: `(userId, txnAId, txnBId)`.

### Off-budget account interaction

Borrowed from Actual Budget: accounts have an `isOnBudget`
boolean (default true, added to `ledgerAccounts` via a separate
Trekker task). Transfers between two on-budget accounts are
excluded from spending totals (the pair cancels). Transfers
between an on-budget and an off-budget account are treated as
ordinary income/expense on the on-budget side, since the user is
moving money in or out of their tracked budget.

The budget aggregation predicate reflects this: the paired-transfer
exclusion only applies when _both_ legs are on-budget. One-leg
cases (savings deposit from checking, loan payment from checking
to an off-budget loan account) leave the on-budget leg visible in
budget totals, categorized however the user (or a rule) labels
the transaction — it contributes to the category's actual just
like any other expense or income. A reserved "Transfers out" /
"Transfers in" pair of categories is **not** introduced; users
who want to bucket these explicitly can create their own
categories and apply them via a merchant rule.

### Budget aggregation impact

`src/modules/budgets/services/get-budget-vs-actual.ts` already
reads `transactions` and `splitLines`. The paired-transfer filter
adds:

```sql
WHERE NOT EXISTS (
  SELECT 1 FROM transfers
   WHERE (from_transaction_id = t.id OR to_transaction_id = t.id)
     AND deleted_at IS NULL
)
```

The parentheses around the OR matter — SQL's AND-binds-tighter
precedence would otherwise let soft-deleted transfers still
exclude one leg. Verify performance with partial indexes on
`transfers (from_transaction_id) WHERE deleted_at IS NULL` and
the mirror.

## API surface

Server functions in `src/modules/transfers/api/`:

- `listTransfers({ since?: Date })` — GET.
- `listPendingCandidates()` — GET, returns review-queue items.
- `pairTransactions(txnAId, txnBId)` — POST, writes a transfer row.
- `unpairTransfer(id)` — POST, soft-delete.
- `dismissCandidate(txnAId, txnBId, { duration?: 'session' | '30d' | 'permanent' })` — POST.
- Detection worker entry: `runDetection(userId, { windowDays })`.
  Not a server function; called from the import/sync post-commit
  hooks.

## UI

### Transactions list

- Paired transactions render a transfer badge with hover card
  showing the counterpart transaction.
- Row action "Pair as transfer" (when unpaired) / "Unpair" (when
  paired).

### Review queue drawer

- Side-by-side cards per candidate pair: from and to.
- Bulk-confirm "Confirm all high" shortcut.
- Empty state when queue is empty: "No pending transfer
  candidates."

### Settings

- `detectionWindowDays` setting (default 3, range 1–14).
- Toggle to pause auto-detection entirely.

## Edge cases

- **Same-account transfer**: CHECK constraint on `from_transaction_id
<> to_transaction_id` catches user error, but a same-account
  pair is valid (e.g., re-categorizing a pending + posted version
  of the same charge, though that's a dedup case, not a transfer).
  Detection excludes same-account by default; manual pairing
  surfaces a warning.
- **Near-amount mismatch** (currency conversion, fees): detection
  uses integer cents; $0.01 mismatches are flagged as `low`.
  Larger mismatches don't auto-suggest.
- **Multiple candidates for one transaction**: detection prefers
  the closest-date match. Tie-breakers: same account pair as
  previously confirmed, then smallest amount delta.
- **User deletes one side of a pair**: FK cascade drops the
  `transfers` row. Budget aggregation self-heals.
- **Re-importing a transaction that was previously in a pair**:
  dedup on the transactions side (existing import logic) keeps
  the id stable, so the transfer row survives.
- **Very active accounts** (e.g., corporate card with 200 txns in
  a week): detection runs over the window per import; a GIN index
  on `(user_id, posted_at, amount_cents)` keeps candidate lookup
  fast.

## Open questions

- **Heuristic tuning**: default window of 3 days might miss
  slow-posting ACH transfers (up to 5 business days). Revisit
  after first real-world usage.
- **"Internal vs. external" split**: Copilot distinguishes
  "transfer" (between your accounts) from "payment" (e.g., paying
  off a credit card balance). In this spec both map to the same
  table. Evaluate whether the UI needs separate copy/iconography
  for the payment subcase.
- **Transfer categories**: some users want to categorize transfers
  (e.g., "savings contribution"). Currently excluded from
  spending but no category concept. Could layer on top: an
  optional `categoryId` on `transfers` for reporting without
  affecting budgets.
