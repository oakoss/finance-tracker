# Idea 0001: Net Worth History Page

Status: exploring
Date: 2026-04-14
Related: EPIC-6 (Dashboard) widget surface

## What

A page that plots total net worth (sum of all asset-account
balances minus sum of all liability-account balances) over time,
with drill-down into the contribution of each account type.
Requires a new `account_balance_snapshots` table that records one
row per account per day. Snapshots are cumulative, so any
mutation affecting a historical date (CSV imports, edits,
deletes, reconciliation adjustments) has to rewrite every
subsequent daily snapshot for that account — not just the day of
the mutation — or the chart drifts after routine history
corrections. A nightly Nitro task fills same-day snapshots; a
post-mutation recompute handles the backfill.

## Why

Research 0005 (Copilot Money comparison) identified net worth
tracking as a table-stakes feature for finance apps we compete
with. It's a direct long-term signal of financial progress and
pairs with the debt payoff planner (spec 0003). Without
snapshots we can only render a "today" number; the chart
requires historical data and can't be reconstructed from
transactions alone (starting balances, imported accounts, asset
revaluations).

## Open questions

- Snapshot cadence: daily everywhere, or daily for manual-entry
  accounts + on-sync-pull for synced accounts (spec 0001)?
- Retention: keep full daily history forever, or aggregate to
  monthly after 1 year?
- Real-estate / manual assets: Zillow-style lookups (Copilot
  does this) or user-entered revaluations only?
- Chart library: piggyback on the Recharts stack from the
  reports/dashboard work (EPIC-6)?
