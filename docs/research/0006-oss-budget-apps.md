# Research: OSS budget apps (Actual Budget, kingfisherfox/budget)

Date: 2026-04-13
Related: EPIC-6 (Reports), EPIC-20 (Budget), EPIC-5 (Imports),
EPIC-29 (Sync), spec 0002 (Rules), spec 0004 (Transfers),
spec 0006 (Statements)

## Summary

Two open-source personal finance apps, reviewed for ideas worth
pulling into this project.

**Actual Budget** (actualbudget/actual, ~26k stars) is a mature
reference app in this space: envelope/zero-based budgeting,
first-class rules + schedules + reconciliation, a bank-sync
server with SimpleFIN / GoCardless / Pluggy adapters, and a
reports dashboard. Local-first CRDT sync doesn't fit our
TanStack-Start + Postgres stack, but many of the UX patterns and
data-model choices translate cleanly.

**kingfisherfox/budget** is a much smaller PWA (4 stars, 27
commits over 4 days in late March / early April 2026) but has a
distinctive dual-bar budget-vs-income visualization and a
wishlist-as-planned-spending flow worth considering.

## Actual Budget — feature catalog

### Headline features

Envelope-style "give every dollar a job" budgeting; Schedules
(recurring transactions) with approximate-amount matching; a
visible rules engine with apply-to-existing; reconciliation with
cleared/locked states; goal templates via a mini-DSL in category
notes; multi-device sync via self-hosted server; bank-sync
adapters; PWA + desktop Electron + mobile apps.

### Distinctive UX

- "To Budget" number at the top of the budget view that must
  reach zero.
- Overspend shown in red and auto-deducted from next month's
  "To Budget".
- `~` prefix on schedules to indicate approximate amounts (±7.5%
  tolerance by default).
- 2-day match window for linking bank transactions to schedules.
- "Lock transactions" reconciliation end-state that freezes rows
  until explicitly unlocked.

### Data model choices

- **Transfers are a linked pair** (same as our ADR 0025).
  Transfers to on-budget accounts get a reserved `Transfer`
  category; transfers to off-budget accounts are treated like
  ordinary income/expense.
- Categories are a single level under category **groups** — a
  strict two-level hierarchy.
- Overspending rollover is implicit: the category resets to zero
  next month and the overage subtracts from global "To Budget".
- Payees are first-class; transfers are modeled as "custom
  payees" so rules can target them.
- "Held" income reserves money for future months.

### Architecture

Local-first SQLite in the browser (WASM) with a sync server
shipping CRDT-style messages. Not a fit for our server-first
stack. Operational concepts worth borrowing: deterministic merge
of imports, idempotent transaction IDs, schedule match windows.

### Import / sync

Three adapters today: SimpleFIN Bridge (North America),
GoCardless (EU — currently not accepting new accounts per their
docs), Pluggy (Brazil). **Manual fetch only** — Actual doesn't
refresh bank data automatically; users click refresh. Credentials
stored server-side and **not end-to-end encrypted** (readable by
server admins), flagged openly in their docs as a caveat.
CSV / OFX / QFX import runs rules on-the-fly.

### Budgeting

Two modes: **Envelope** (with rollover) and **Tracking** (budget-
vs-actual without rollover). "To Be Budgeted" = unallocated income.
Overspent categories roll into next month's TBB. End-of-month
cleanup (experimental) moves surplus into savings.

### Rules engine

Conditions × actions on imported transactions. Condition fields:
`imported payee`, `payee`, `account`, `category`, `date`, `notes`,
`amount`, `amount (inflow)`, `amount (outflow)`. Operators: `is` /
`is not`, `contains` / `does not contain`, `matches` (regex),
`one of` / `not one of`. Actions: set `category`, `payee`, `notes`,
`cleared`, `account`, `date`, `amount`; notes support prepend /
append. **Three stages**: `pre`, `default`, `post`. Within a
stage, rules run least-specific first; last action wins.
**Apply-to-existing** previews matches and bulk-applies.

### Recurring / scheduled

`Schedules` entity with rich recurrence: specific days (1st, 15th,
31st, last), weekly, biweekly, monthly, n-monthly, yearly,
multiple dates per schedule, and a weekend-adjust rule.
Configurable upcoming window (1 day–1 month). Auto-link to bank
transactions within ±2 days. Three workflow modes:
post-automatically, post-with-approval, skip-next.

### Reports

Cash Flow, Net Worth, Spending (period comparison), Summary Card,
Calendar Card (daily income/expense heatmap), Markdown text
widget, custom report builder with filters and live/static date
ranges, multiple dashboards. Experimental: Crossover Point (passive
income crosses expenses — FIRE crowd), Budget Analysis, Balance
Forecast.

### Reconciliation

Explicit workflow: enter statement balance → toggle "cleared" per
row (gray circle → green) → when cleared total equals entered
balance, "Lock transactions" to reconcile. Locked = immutable
until unlocked. Also usable for asset revaluation on off-budget
accounts.

### Community signals

Hot topics: per-currency decimal places, per-account grouping in
sidebar, currency symbols, goal template feedback, performance
(budget grid re-renders slow on large budgets). Much of the top-
PR volume is moving client state off bespoke queries into
TanStack Query — validates our stack choice.

### Pain points to avoid

- Sync credentials not end-to-end encrypted on the server.
- GoCardless de-facto unusable for new EU users.
- Performance degradation on large budgets (#4045).
- No automatic bank refresh — users complain.
- Two-level category hierarchy is inflexible for some users.
- Goal templates stored as structured data inside free-text
  notes — clever but regrettable long-term.

## kingfisherfox/budget — feature catalog

Small solo-hacker PWA. 27 commits over 4 days. Worth reviewing
for one novel visualization idea and a lightweight "planned
spending" pattern.

### Stack

Node + Express 4 + TypeScript + Prisma 6 + Postgres backend;
Vite 8 + React 19 + react-router-dom 7 + Tailwind v4 + Recharts 3
frontend. Cookie-session auth (no Better Auth). Docker Compose
deploy. Installable PWA with a minimal no-cache service worker.

### Data model

`User`, `Session`, `SystemSettings` (signups on/off),
`AppSettings` (currency, timezone, domain), `Category` (with
`isIncome` flag, color, sortOrder), `CategoryBudget` (monthly
amount), `Expense`, `RecurringExpense` + `RecurringSubcategory`,
`WishlistItem`.

### Pages

Dashboard, Expenses, Wishlist, Settings, Account (sign-in).
Bottom-tab nav with 4 tabs.

### Distinctive features

1. **Dual-bar Month Overview** — two bars sharing a scale. One
   is Actual/Budget (amber/emerald/red), the other is
   Income/Saved (grey/black/blue). Overspending in the first bar
   literally "eats" the black savings segment in the second. An
   opinionated mental model not found in Copilot or Actual.
2. **Wishlist → purchase-as-expense** — a wishlist item has a
   "Purchase" action that converts it into an expense. Lightweight
   planned-spending flow.
3. **"Common" flag on recurring items** — always-visible pins at
   the top of the recurring list.
4. **`isIncome` boolean on Category** — income modeled as a
   negative-direction category rather than a separate entity.
5. **Month-scoped URL state** — `?month=YYYY-MM` with a sticky
   `MonthStrip` component. Matches our URL-as-state priority.
6. **Dashboard category pie with drill-down** — tap a slice to
   drill into aggregated expense names for the month.
7. **Recurring templates with named subcategories** (e.g. "Rent
   → Villa/Studio"). Lightweight one-level nesting on recurring
   items without a full hierarchy.

## Ideas worth pulling, sized

### Quick wins

- **Schedule approximate-amount flag** on `recurring_rules` — a
  boolean "amount is approximate" plus a tolerance %. Improves
  match-to-bank-transaction precision. Augments spec 0002.
- **Weekend-adjust** field on recurring (before / after /
  skip-weekend). Small field, high value for bill tracking.
- **Apply-rule-to-existing preview** — already in spec 0002;
  Actual's implementation confirms the UX is right.
- **"Common" pinning on recurring** (from kingfisherfox) — a
  small UX touch for the recurring-rules list.
- **Off-budget account flag + reserved `Transfer` category** —
  clarifies the transfer/budget interaction we designed in spec
  0004 without new tables. Pair with an `isOnBudget` column on
  `ledgerAccounts`.
- **Month-scoped URL state with MonthStrip** (from kingfisherfox)
  — matches our URL-as-state priority; useful for dashboard and
  reports.

### Medium bets

- **Reconciliation workflow** — cleared-circle / enter-statement-
  balance / lock-transactions / unlock. Slots directly into spec
  0006 (statements) and was already loosely described there.
- **"To Be Budgeted" + overspend rollover** — if we commit to
  envelope semantics. Needs a `budget_month_allocations`
  (category × month) ledger table.
- **Rules three stages** (`pre` / `default` / `post`) — avoids
  the "least-specific-first ordering is confusing" complaint.
  Column on `merchant_rules`. Augments spec 0002 / ADR 0027.
- **Schedule → budget template linkage** — once schedules exist,
  pulling the scheduled amount into the category's monthly
  budget is a straightforward addition.
- **Calendar-card + cash-flow reports** for TREK-28. Highest
  value-per-effort report types in Actual's set.
- **Dual-bar Month Overview widget** (from kingfisherfox) — an
  opinionated visualization we'd ship as one dashboard widget
  among others. Pairs with TREK-81.
- **Wishlist / planned spending** (from kingfisherfox) — small
  standalone module; an "I want to buy X" list where each item
  converts into an expense on purchase.

### Large bets

- **Goal templates** — Actual's mini-DSL in category notes is
  popular but implemented wrong (parsing structured data from
  free text). Model as a first-class `budget_goals` table:
  `type` enum (`fixed`, `monthly_average`, `percent_of_income`,
  `target_by_date`, `remainder_distribution`), `params` JSONB.
  Worth its own spec.
- **Bank-sync adapter layering** — Actual's three-adapter shape
  already matches our planned sync module (spec 0001). Pull the
  encryption-at-rest lesson forward; they flag unencrypted creds
  as a mistake.
- **Crossover point / balance forecast reports** — FIRE-audience
  differentiators; only worthwhile after the reports basics
  land.

## Already covered (skip)

- Two-level category hierarchy (groups → categories).
- CSV import with column mapper (ours is more ergonomic).
- Payees module + payee aliases (we extracted this per ADR 0024).
- Recurring rules scaffolding (`recurring_rules` module exists).
- Multi-provider sync plan (matches our BYO-credentials design
  in spec 0001).
- Structured audit logging (Actual doesn't have evlog-style
  action/outcome trail).

## Explicitly not worth copying

- **Local-first CRDT sync engine** — wrong fit for our stack.
  Borrow concepts (idempotent op IDs, schedule match windows),
  not architecture.
- **Two-level-only category hierarchy as a hard rule** — if we
  want nested categories later, Actual is a cautionary tale.
- **Category templates parsed from free-text notes** — clever but
  a long-term regret.
- **Manual-only bank sync refresh** — scheduled fetch is planned
  in spec 0001.
- **Sync credentials stored server-side without end-to-end
  encryption** — we already plan envelope encryption per ADR 0023.
- **kingfisherfox/budget auth stack** — they rebuilt cookies
  manually; we have Better Auth.
- **`isIncome` boolean on Category** (from kingfisherfox) — our
  `transactionDirectionEnum` plus income categories already
  handle this cleanly.

## Sources

- [actualbudget/actual](https://github.com/actualbudget/actual)
  — repo, releases v26.1.0 through v26.4.0, issues #3606, #4045,
  #5191, #5570, #6134, #6766, #6921, #6954, #7070, #7310, #7345.
- [actualbudget.org/docs](https://actualbudget.org/docs/) —
  budgeting, schedules, rules, accounts/reconciliation,
  transactions/transfers, reports, advanced/bank-sync,
  experimental, experimental/goal-templates.
- [kingfisherfox/budget](https://github.com/kingfisherfox/budget)
  — README, `backend/prisma/schema.prisma`,
  `backend/src/routes/`, `frontend/src/dashboard/` (dual-bar,
  pie drill, recurring pinning), `frontend/src/pages/WishlistPage.tsx`,
  `docs/ui-pages.md`.
- Prior context: `docs/research/0005-copilot-comparison.md`.
