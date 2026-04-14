# Spec: Debt Module

Status: draft
Epic: EPIC-TBD (Debt)
Date: 2026-04-13

## Context

The `debt` module has DB scaffolding (`debtStrategies`,
`debtStrategyOrder`, `debtStrategyRuns`) but no API, services, or
UI. Copilot Money doesn't ship a dedicated debt payoff planner;
their Accounts tab lumps debt in with net worth. A payoff planner
is a differentiator for users paying down credit cards, loans, or
lines of credit.

ADR 0026 locks in the rank semantics: always stored,
strategy-type-driven initial compute, drift banner on reorder.

## Scope

**In scope:**

- One active strategy per user (soft limit), many archived.
- Create strategy: pick liability accounts, algorithm
  (snowball / avalanche / custom), set `targetMonthlyPaymentCents`.
- Strategy editor: reorder accounts (drag), set per-account
  minimum payment override and APR override, recompute via
  algorithm.
- Payoff projection: compute month-by-month until each account
  hits zero. Surface total interest paid, payoff date, and total
  months.
- Projection chart (piggybacks TREK-27).
- Monthly extra-payment slider (ghost preview while dragging).
- "Save projection" writes a `debtStrategyRuns` row.

**Out of scope:**

- Automatic liability detection from transactions (manual
  account tagging only).
- Lender-specific grace period or fee modeling.
- Refinance / consolidation simulation.
- Multi-user shared strategies (covered by household epic).

## User flows

### Flow 1: Create a strategy

1. `/_app/debt` empty state → "Create your first strategy".
2. Step 1: pick accounts. Only liability accounts (credit, loan)
   appear. Show current balance and APR per account.
3. Step 2: pick algorithm. Snowball (smallest balance first),
   avalanche (highest APR first), custom (manual).
4. Step 3: set `targetMonthlyPaymentCents`. Default = sum of
   minimum payments; user can increase.
5. On save, server computes initial rank per the algorithm and
   writes `debtStrategies` + `debtStrategyOrder` rows. Initial
   projection run also writes a `debtStrategyRuns` row.

### Flow 2: View and adjust projection

1. Strategy page shows: total debt, monthly payment, payoff date,
   total interest, ordered account list with per-account projected
   months.
2. Chart: stacked-area payoff projection by account over time.
3. Extra-payment slider: $0 → $2000 above the target. As the
   user drags, the chart ghosts in the new payoff date. Release
   commits a preview (not saved yet).
4. "Save as run" persists the preview into `debtStrategyRuns`.

### Flow 3: Reorder accounts

1. Drag an account card to a new position.
2. If the strategy is `snowball` or `avalanche`, a banner appears:
   "Order drifted from the algorithm." Three actions per ADR 0026:
   "Recompute" (runs the algorithm, overwrites ranks), "Keep as
   custom" (flips `strategyType` to `custom`), or "Dismiss"
   (hides the banner for this session without changing state —
   useful while experimenting).
3. Audit log entry `debt.strategy.reorder.v1` with before/after
   ranks.

### Flow 4: Recompute

1. Explicit "Recompute order" button in the strategy menu.
2. Runs the algorithm with current balance/APR; writes the new
   ranks.
3. Dismisses any active drift banner.

## Data model

### Schema additions to `debtStrategies`

| Column                      | Type    | Notes                                                                                                                                                                                                                                                                                                                                   |
| --------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `targetMonthlyPaymentCents` | integer | Required. Validated app-side against `SUM(effective minimum payment across all ordered accounts)` on every mutation that can change either side of the inequality: create, update, reorder, per-account override edit, recompute, and runProjection. Failure blocks the mutation with an actionable error naming the offending accounts |
| `isActive`                  | boolean | default false; a `WHERE userId = X AND isActive = true` partial unique index caps active to 1 per user                                                                                                                                                                                                                                  |

### Schema additions to `debtStrategyOrder`

| Column                | Type    | Notes                                           |
| --------------------- | ------- | ----------------------------------------------- |
| `minimumPaymentCents` | integer | Nullable override of account's recorded minimum |

Existing `overrideAprBps` stays.

Indexes: the existing `uniqueIndex('debt_strategy_order_unique_idx')` on `(strategyId, accountId)` stays. New: `uniqueIndex('debt_strategy_order_rank_idx').on(strategyId, rank)` per ADR 0026 to enforce the ordering invariant.

### `debtStrategyRuns.resultData` shape

Typed via ArkType in `models.ts`:

```ts
type DebtRunResult = {
  byAccount: Array<{
    accountId: string;
    monthsToPayoff: number;
    totalInterestCents: number;
    schedule: Array<{
      month: number;
      balanceCents: number;
      paymentCents: number;
      interestCents: number;
    }>;
  }>;
  total: {
    monthsToPayoff: number;
    totalInterestCents: number;
    payoffDate: string; // ISO
    monthlyPaymentCents: number;
  };
};
```

### `debtStrategyRuns.snapshotData` shape

```ts
type DebtRunSnapshot = {
  strategyType: 'snowball' | 'avalanche' | 'custom';
  targetMonthlyPaymentCents: number;
  extraPaymentCents: number;
  accounts: Array<{
    accountId: string;
    balanceCents: number;
    aprBps: number;
    minimumPaymentCents: number;
    rank: number;
  }>;
};
```

## API surface

Server functions in `src/modules/debt/api/`:

- `listStrategies()` — GET.
- `createStrategy(input)` — POST.
- `updateStrategy(id, patch)` — POST.
- `deleteStrategy(id)` — POST, soft-delete.
- `setActiveStrategy(id)` — POST, flips the partial-unique
  constraint atomically.
- `reorderStrategy(strategyId, accountIds)` — POST, replaces rank
  ordering transactionally.
- `recomputeStrategy(strategyId)` — POST, re-runs algorithm and
  overwrites ranks.
- `runProjection(strategyId, extraPaymentCents?)` — POST, computes
  and writes a `debtStrategyRuns` row. Returns the result.
- `listRuns(strategyId, { limit })` — GET.

## UI

### Debt page (`/_app/debt`)

- Empty state with "Create strategy" CTA.
- Active strategy card on top: total, monthly payment, payoff
  date, total interest.
- Account list below: ordered cards with balance, APR, min
  payment, projected months, drag handle.
- Projection chart below the list.
- Extra-payment slider below the chart.
- "Save run" button on the right.
- Archived strategies in a collapsed section.

### Strategy editor dialog

- Accounts picker (step 1) with liability filter.
- Algorithm picker (step 2) with inline explainer for each.
- Payment setup (step 3) with validated `targetMonthlyPaymentCents`.

## Edge cases

- **User deletes an account in an active strategy**: on the
  accounts cascade, `debtStrategyOrder` row is gone; strategy auto-
  recomputes ranks and surfaces a banner "Account X was removed."
- **User marks an account as closed mid-payoff**: planner
  excludes closed accounts from future runs; existing runs keep
  their snapshot.
- **APR of 0%**: avalanche algorithm treats APR of 0 as the lowest
  priority (no interest accrues).
- **Balance increases after reorder**: if balances grow past
  `targetMonthlyPaymentCents` minus minimums for other accounts,
  surface a warning and fail the projection until user raises
  target.
- **Multiple strategies, one active**: partial unique index
  `(userId) WHERE isActive = true` enforces. `setActiveStrategy`
  runs inside a DB transaction that flips the old active to
  inactive first.

## Open questions

- **Compounding frequency**: daily vs. monthly. Daily is more
  accurate for credit cards (most issuers compound daily) but
  month-level is simpler to chart. Default monthly; add a
  per-strategy toggle later.
- **Minimum payment model**: fixed dollar amount, percentage of
  balance, or "greater of $N or P%"? Credit cards typically use
  the last. Start with fixed dollar, add the others when needed.
- **Effect of new charges on the strategy's projected accounts**:
  v1 assumes no new spending on liability accounts. Document the
  assumption prominently; model-in-new-spending is a v2 feature.
