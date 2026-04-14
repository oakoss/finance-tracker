# Research: Copilot Money feature comparison

Date: 2026-04-13
Related: EPIC-6 (Reports), EPIC-20 (Budget), EPIC-22 (UX Polish),
EPIC-27 (Household), EPIC-5 (Imports)

## Summary

Copilot Money is an Apple-only personal finance app ($95/yr, single
tier) that reviewers consistently describe as the best-designed
budgeting app since Mint died. It leans hard on Plaid for aggregation
and on a private per-user ML model for categorization. Since this app
is web-first with manual entry and CSV import, Copilot's
aggregation-dependent features (Plaid sync, investment holdings, Apple
Card integration, live notifications) are out of scope without
upstream integration work. Many of Copilot's best-reviewed features are polished UX rather
than aggregation magic: recurring detection, transfer detection,
merchant logos, rolling budgets, month-in-review. Those are all
viable here.

This doc maps Copilot's feature set against what the app has today
and what's already in the Trekker backlog, then proposes ideas sized
by effort.

## What the app has today

Modules with UI + API:

- `accounts`, `budgets`, `categories`, `imports`, `transactions`
- `profile`, `export`, `preferences` (user utilities)

Modules scaffolded (DB tables + models, no UI/API yet):

- `debt` — strategies, order, runs
- `rules` — recurring rules, merchant rules, payee aliases
- `transfers` — internal transfer records
- `promotions` — promos, buckets, bucket transactions
- `statements` — statements + attachments

Routes under `_app/`: dashboard, transactions, imports (+ detail),
accounts, categories, budgets, profile. No reports, payees,
debt, rules, transfers, statements, or net worth routes.

## Gap map (Copilot feature → this app)

| Area                     | Copilot                                           | This app                                                     | Delta                                   |
| ------------------------ | ------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------- |
| Account sync             | Plaid + MX (incl. Apple Card, crypto, brokerages) | Manual + CSV                                                 | Aggregation out of scope                |
| Auto-categorization      | Per-user ML model                                 | `rules` module scaffolded; no UI                             | Big UX win if rules + suggestions ship  |
| Merchant cleanup + logos | In-app cleanup, logo CDN                          | None                                                         | Logo lookup is cheap; cleanup is medium |
| Rules management         | Create-only, no list/edit UI (top complaint)      | DB ready, no UI                                              | Easy beat — ship the list/edit UI       |
| Recurring detection      | Heuristic pattern match, "R" indicator            | DB has `recurring_rules`; no detection                       | Heuristic is doable without Plaid       |
| Budgeting                | Rolling + magic-wand rebalance + savings goals    | Budget module shipped; unclear if rollover                   | Check rollover support; add if missing  |
| Cash flow + trend charts | Spending line, MoM comparisons                    | Charts in EPIC-6 backlog                                     | Already planned                         |
| Net worth                | Historical graph across all account types         | No net worth view                                            | Needs balance snapshot table            |
| Investment tracking      | Holdings + performance vs. benchmark              | None                                                         | Hard without Plaid                      |
| Debt payoff              | Absent (gap in Copilot)                           | `debt` scaffolded                                            | Easy differentiator                     |
| Shared spending          | Included in base plan                             | EPIC-27 planned                                              | Already in backlog                      |
| Month in Review          | Templated recap                                   | None                                                         | Medium; pure statistics                 |
| Natural-language search  | Query → filters                                   | Standard filters only                                        | Nice-to-have, LLM-backed                |
| Tags, notes, splits      | Full support                                      | Schema has `tags`, `transaction_tags`, `split_lines`, `memo` | Verify UI exposure, add where missing   |
| Transfer detection       | Auto-match opposite-sign pairs                    | `transfers` scaffolded; no UI                                | Heuristic, no Plaid needed              |
| Widgets / Siri           | iOS widgets, no Siri                              | N/A (web)                                                    | PWA home-screen tile is the analogue    |
| Onboarding               | 30-day trial before connecting                    | TREK-68 planned                                              | Already planned                         |
| Command palette          | Cmd-K search                                      | TREK-66 planned                                              | Already planned                         |
| Export                   | CSV                                               | `export` module present                                      | Parity                                  |

## Ideas, sized

### Quick wins (days, not weeks)

1. **Rule management UI** (`rules` module).
   Copilot's #1 user complaint is "I can't edit my rules." Ship a
   rules list page with create/edit/delete. Tables exist. Drag-and-drop
   priority ordering and "apply to existing transactions" are the
   killer features.
   _Scope_: rules/api + rules/services + rules/components +
   `/_app/rules` route. E2E + server fn tests per DoD.

2. **Transfer auto-detection** (`transfers` module).
   Heuristic: within N days, same absolute amount, one debit + one
   credit, paired account pair. Suggest match; user confirms. Excludes
   matched pairs from budget totals.
   _Scope_: detection service + review UI + transaction-list badge.

3. **Merchant logos on transactions.**
   Brandfetch or Clearbit API by merchant domain; fallback to
   category icon. Visibly upgrades the transaction list on day one.
   _Scope_: logo resolver service, cache table, `<MerchantAvatar>`
   component, Content Security Policy allowlist.

4. **Recurring transaction detection** (`rules.recurring_rules`).
   Heuristic over 3+ months of history: same merchant/payee, similar
   amount (±10%), regular cadence. Surface in dashboard widget +
   budget pre-fill.

5. **Transaction splits + tags confirmation.**
   Verify `transactions` already supports; if not, add. Copilot treats
   these as essential — missing them pushes power users away.

### Medium bets (1–2 weeks)

6. **Debt payoff planner** (`debt` module, fully scaffolded).
   Avalanche vs. snowball strategy selector, payoff projection chart
   (already in TREK-27), monthly extra-payment slider.
   Differentiator — Copilot doesn't do this.

7. **Net worth history page.**
   Daily balance snapshot table (written by a nightly job + on mutation),
   historical chart aggregating across account types. Hangs off the
   accounts page or its own route.

8. **Rolling budgets + "magic wand" rebalance.**
   Audit current budget module; add rollover if missing. Magic wand
   = redistribute remaining budget across over-spent categories
   proportionally to actuals, preserving total.

9. **Month in Review.**
   Templated recap: top merchants, top categories, MoM deltas, over/
   under-budget highlights, subscription creep alerts. No LLM needed
   for v1 — just SQL + templated copy. TREK-28 territory.

10. **Payees page** (TREK-57).
    Already planned. Pairs well with merchant logos and payee alias
    rules (merchant cleanup).

### Large bets (month+)

11. **Household / multi-user access** (EPIC-27).
    Copilot ships this in the base tier. Schema impact is broad —
    plan early even if shipped late.

12. **Merchant name cleanup service.**
    Regex/lookup pipeline over raw descriptors. Ship alongside rules
    and payee aliases. Large because the dataset is the moat; small
    start via user-contributed rules scales up.

13. **Natural-language search.**
    "Coffee last month over $10" → structured filter. LLM-backed, or
    rule-based grammar for common shapes. Reasonable v1 without LLM.

14. **PWA + home-screen widgets.**
    Closest thing to Copilot's iOS widgets on the web. Requires PWA
    manifest + offline-safe dashboard summary. Not on any Trekker epic.

### Won't do (Plaid-dependent)

15. Account aggregation, real-time balance updates, Apple Card
    integration, investment holdings. CSV import UX is the answer
    for manual-entry users — invest there instead (EPIC-5 is active).

## Cross-reference to Trekker backlog

Already planned — no new tickets needed:

- TREK-24 (Dashboard) → Copilot's home screen equivalent
- TREK-25/26/27 (Charts) → cash flow + category + debt payoff
- TREK-28 (Reports) → Month in Review lives here
- TREK-57 (Payees CRUD) → enables merchant cleanup surface
- TREK-66 (Command palette) → Copilot has Cmd-K
- TREK-68 (Onboarding) → Copilot's 30-day trial pattern
- EPIC-27 (Household) → shared spending parity

Would likely need new tickets (if pursued):

- Rule management UI (rules module has no tasks)
- Transfer auto-detection (transfers module has no tasks)
- Merchant logo resolver
- Recurring detection UI + dashboard widget
- Net worth history page + balance snapshot table
- Debt payoff planner UI (debt module has no tasks)
- Merchant name cleanup service

## Notable UX patterns to borrow

- **"Excluded from budget" toggle** on any transaction. One-tap to
  remove a transaction from spending totals (reimbursements,
  reimbursed-by-employer lunches, etc.). Copilot calls this "Type"
  and supports Regular / Internal / Excluded / Income.
- **30-day free trial before connecting anything.** Users can poke
  around with sample data first. Maps to our demo mode / onboarding.
- **Magic-link for partner access.** Lightweight invite UX for
  EPIC-27 — no full signup flow for the partner.
- **Per-category color + emoji.** Copilot lets users pick both.
  Small touch that makes lists feel personal.

## Sources

- [Copilot homepage](https://copilot.money/)
- [Copilot Intelligence](https://intelligence.copilot.money/)
- [Pricing](https://copilot.money/pricing/)
- [Help Center — Transaction Types](https://help.copilot.money/en/articles/3971267-transaction-types)
- [Help Center — Sharing with a Partner](https://help.copilot.money/en/articles/4523792-sharing-your-account-with-a-partner)
- [Help Center — Investments](https://help.copilot.money/en/articles/5377645-investments-tab-overview)
- [Help Center — Notifications](https://help.copilot.money/en/articles/10671399-notifications)
- [Help Center — Widgets](https://help.copilot.money/en/articles/9834331-adding-widgets)
- [Changelog](https://changelog.copilot.money/)
- [Plaid case study](https://plaid.com/customer-stories/copilot/)
- [9to5Mac review](https://9to5mac.com/2025/06/26/copilot-money-is-the-budgeting-app-youve-been-looking-for/)
- [Money with Katie review](https://moneywithkatie.com/copilot-review-a-budgeting-app-that-finally-gets-it-right/)
- [SaaSweep 6-week test](https://www.saasweep.com/blog/copilot-money-review)
- [The College Investor review](https://thecollegeinvestor.com/41976/copilot-review/)
