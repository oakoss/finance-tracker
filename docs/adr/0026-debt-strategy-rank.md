# ADR 0026: Debt Strategy Rank Is Always Stored

Date: 2026-04-13
Status: Accepted
Tracking: EPIC-3 (Debt Strategy)

## Context

The debt module (`src/modules/debt/db/schema.ts`) defines three
tables: `debtStrategies` (name, strategyType enum of
`snowball`/`avalanche`/`custom`, userId), `debtStrategyOrder`
(strategyId, accountId, rank, overrideAprBps), and
`debtStrategyRuns` (snapshots).

A question surfaces immediately when building a payoff planner:
for `snowball` and `avalanche` strategies, should the per-account
`rank` be stored in `debtStrategyOrder`, or derived on the fly from
account balances / APRs at query time?

Stored rank is stable (the planner shows the same order until the
user explicitly recomputes) but can go stale if an account balance
or APR changes. Derived rank is always current but shifts as
balances evolve, and snapshots become harder to express when
"this strategy's order" is no longer a stored fact.

## Decision

- `rank` is **always stored** in `debtStrategyOrder`, for every
  strategy type including `snowball` and `avalanche`.
- `strategyType` controls how `rank` is **initially computed** when
  the strategy is created or the user clicks "Recompute order":
  - `snowball`: ascending by current balance.
  - `avalanche`: descending by APR (with `overrideAprBps`
    winning over the account's recorded APR).
  - `custom`: user-set ordering from the start.
- User drag-and-drop reorder is always allowed. Reordering a
  `snowball` or `avalanche` strategy does NOT silently flip it to
  `custom`; instead the UI surfaces a "Order drifted from algorithm"
  banner with three actions: `Recompute` (runs the algorithm,
  overwrites ranks), `Keep as custom` (flips `strategyType`), and
  `Dismiss` (hides the banner for the current session while leaving
  `strategyType` as-is). Dismiss lets a user experiment mid-planning
  without committing to either resolution.
- `debtStrategyRuns.snapshotData` captures the ordered account set
  at run time so a run is reproducible later.
- Add `(strategyId, rank)` unique index on `debtStrategyOrder` to
  prevent duplicate ranks within a strategy.

## Alternatives Considered

- **Derive rank at query time for snowball/avalanche.** Rejected —
  adds an implicit dependency on current balance/APR numbers that
  themselves move as transactions land. A planner that renders
  different orders on successive page loads is confusing, and the
  custom case still needs storage, so we end up with two code
  paths.
- **Stored rank, but `custom` only** (drop snowball/avalanche
  enum, treat everything as custom with a compute button).
  Rejected — the enum carries useful intent that survives
  reordering (the user declared "I want avalanche" and the banner
  can nudge them back when drifted).
- **Stored rank, auto-recompute on balance change.** Rejected —
  surprising behavior; users expect the order to be stable unless
  they ask to recompute.

## Consequences

- **Positive**: the planner renders a stable order between explicit
  recompute clicks. Rank edits persist. Snapshots in
  `debtStrategyRuns` are meaningful.
- **Positive**: unique `(strategyId, rank)` index makes the
  ordering invariant enforced at the DB layer.
- **Negative**: stored rank can drift from the algorithm's
  "correct" order when balances change. Mitigated by the drift
  banner and the explicit recompute action.
- **Follow-ups**: the debt spec (`docs/specs/0003-debt-module.md`)
  defines the planner UX, drift banner, and recompute flow.
  Schema adds `targetMonthlyPaymentCents` and `isActive` to
  `debtStrategies` (separate Trekker task, not part of this ADR).
