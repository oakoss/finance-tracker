# Spec: Promotions Module

Status: draft
Epic: EPIC-TBD (Promotions)
Date: 2026-04-13

## Context

The `promotions` module has DB scaffolding (`promotions`,
`promoBuckets`, `promoBucketTransactions`) but no API, services, or
UI. The feature tracks credit card promotional periods: 0% APR
purchase windows, balance transfer offers, and deferred-interest
promos. Users lose real money when promos expire without being
paid off. The deferred-interest case retroactively applies the
full standard APR from the purchase date if unpaid — the trap
these products are designed around.

Research (TREK-74) tagged this as a unique feature vs. Copilot;
this spec fleshes it out so it ships as a working tool instead of
a scaffolded data model.

No ADR required. The data model is concrete and uncontested;
the schema needs a few missing columns documented below.

## Scope

**In scope:**

- Promotion CRUD attached to a credit account.
- Promo bucket tracking (opening principal, current balance,
  closed date).
- Allocation of transactions against a bucket (explicit user
  assignment; auto-allocation is v2).
- Expiration alerts (configurable days-before).
- Deferred-interest retroactive-interest warning with projected
  cost.
- Promo dashboard widget surfacing approaching expirations.

**Out of scope:**

- Auto-allocation of purchases to the right bucket via rules
  (v2; pairs with the rules module).
- Balance-transfer fee modeling.
- Multi-currency promos.
- Promo-specific payment priority in the debt planner (future
  integration point).

## User flows

### Flow 1: Create a promotion on an account

1. Account detail page → "Promotions" tab → "Add promotion".
2. Pick promo type: 0% APR purchase, 0% APR balance transfer,
   deferred interest.
3. Fill: APR during promo (usually 0), standard APR after
   (required for deferred interest), start/end dates, credit
   limit, optional description.
4. If deferred interest, warn inline: "If the balance isn't zero
   by [end date], the card issuer will backdate the standard APR
   to the purchase date."

### Flow 2: Open a bucket

1. From a promotion, click "Open bucket" to record a new
   principal amount (e.g., a $2400 appliance purchase on a 12-mo
   0% APR promo).
2. Set principal, opening date, optional name ("Fridge").
3. Optionally attach the originating transaction.

### Flow 3: Allocate payments against a bucket

1. From the bucket detail view, "Allocate transaction" picker
   shows recent payments on the card.
2. Select a transaction and amount to allocate (can split across
   buckets).
3. Writes a `promoBucketTransactions` row.

### Flow 4: Expiration alerts

1. Daily Nitro task scans promotions: for each with
   `endDate - now <= alertDaysBefore`, emit a toast/email alert.
2. Dashboard widget lists promos within the alert window sorted
   by days-to-expire, with projected retro-interest cost per
   deferred-interest promo.

### Flow 5: Close a bucket / end a promotion

1. When balance reaches zero: "Close bucket" action sets
   `closedAt`.
2. When promo expires: promo stays in the history with a closed
   badge; UI renders differently.

## Data model

### Schema additions to `promotions`

| Column                       | Type    | Notes                                                                                                            |
| ---------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| `standardAprBps`             | integer | Required for deferred interest; APR that applies if the promo isn't paid off in time. Nullable for 0%-APR promos |
| `minimumMonthlyPaymentCents` | integer | Nullable                                                                                                         |
| `gracePeriodDays`            | integer | Nullable — for deferred interest, the days after `endDate` before retro-interest accrual                         |
| `alertDaysBefore`            | integer | Default 30                                                                                                       |

### Schema additions to `promoBuckets`

| Column        | Type | Notes                      |
| ------------- | ---- | -------------------------- |
| `description` | text | Nullable user-visible note |

`currentBalanceCents` is derived from `principalCents` minus the
sum of allocated `promoBucketTransactions.amountCents`; no stored
column.

### CHECK constraints

- `promotions.startDate < endDate`.
- `promotions.promoAprBps >= 0`.
- `promotions.promoType = 'deferred_interest' IMPLIES
standardAprBps IS NOT NULL`. Enforced in application layer
  since pg CHECK with conditional on another column is verbose.
- `promo_bucket_transactions.amountCents > 0`.

### Indexes

- `promotions(accountId, endDate)` for the alert scan and list
  rendering.

## API surface

Server functions in `src/modules/promotions/api/`:

- `listPromotions({ accountId? })` — GET.
- `createPromotion(input)` — POST.
- `updatePromotion(id, patch)` — POST.
- `deletePromotion(id)` — POST, soft-delete.
- `openBucket(promotionId, input)` — POST.
- `closeBucket(id)` — POST.
- `allocateTransaction(bucketId, transactionId, amountCents)` —
  POST, validates the transaction belongs to the promo's account
  and that the total allocated doesn't exceed the transaction's
  amount.
- `unallocateTransaction(allocationId)` — POST, soft-delete.
- `summarizePromoCost(promotionId)` — GET, returns projected
  retro-interest cost for deferred-interest promos assuming the
  current balance stays flat until `endDate`.

## UI

### Account detail page

- New "Promotions" tab. Default sort: active first (by end date),
  then closed. Columns: type, rate, end date, buckets, balance.
- Per-promotion detail view lists its buckets + allocated
  transactions + running balance.

### Dashboard widget (`EPIC-6`)

- "Promos expiring soon" widget: promos with end date within
  `alertDaysBefore`. Each row shows days remaining and projected
  retro cost (for deferred interest).

### Alert surfacing

- Toast on dashboard load if any promo is within 14 days of
  expiration and not paid off.
- Email via the existing Brevo pipeline at 30 / 14 / 7 days before
  deferred-interest expiration.

## Edge cases

- **Promo expires mid-month with an active bucket**: bucket stays
  open; UI flips into "Expired — retro interest may apply" state
  and surfaces the cost estimate.
- **User closes the credit account**: promos cascade; buckets and
  allocations go away with the account (soft-delete propagation).
- **Over-allocation to a bucket**: validation prevents allocating
  more than the transaction's amount across all buckets; UI
  surfaces a "You have $X left to allocate" helper on the picker.
- **Multiple buckets on one promo**: perfectly valid (e.g., two
  purchases on the same 0% window); the running total across
  buckets must stay under `promoLimitCents` if set.
- **Balance transfer fee**: v1 records the fee as a separate
  transaction on the account and doesn't special-case it. Future
  enhancement may model fees directly.
- **Time zone on alerts**: use user's `timeZone` preference for
  computing "days remaining."

## Open questions

- **Auto-allocation**: tempting to layer onto the rules module so
  that purchases on a card with an active promo bucket are
  auto-allocated. Defer to v2; specify the rules integration in
  a follow-up spec.
- **Fee modeling**: balance-transfer promos usually come with a
  3–5% fee. Store as a separate field on the promo? Or leave as
  a one-off transaction the user already records? Leaning toward
  a dedicated `feeCents` field with an auto-created expense
  transaction, but punting for now.
- **Retro-interest cost projection**: straight APR-on-average-
  balance is accurate enough for warning purposes. True issuer
  math varies; the UI labels the number as "estimated."
