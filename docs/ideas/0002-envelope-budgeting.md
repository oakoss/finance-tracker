# Idea 0002: Envelope Budgeting for the Budgets Module

Status: exploring
Date: 2026-04-14
Related: EPIC-20 (Budget basics shipped TREK-59/60/61); new epic when envelope work is next

## What

Adopt envelope / zero-based budgeting semantics for the existing
budgets module: a "To Be Budgeted" number at the top of the
budget view that must reach zero, per-category monthly
allocations stored in a new `budget_month_allocations`
(category × month) table, and rollover behavior where overspent
categories auto-deduct from the next month's TBB. Copilot's
"adaptive budgets" with a magic-wand rebalance across over-spent
categories is a natural v1 companion.

## Why

Research 0006 (Actual Budget comparison) shows envelope is the
dominant mental model for OSS finance apps; users coming from
YNAB or Actual expect it. The current budgets module is
"budget-vs-actual" only with no rollover. Rolling balances change
the shape of the budgets module enough to warrant an ADR before
any spec. Envelope vs. tracking-only is a fork that affects
every downstream budget feature: goal templates, "holding"
future-month income, schedule → budget pre-fill.

## Open questions

- Offer both modes (Actual supports Rollover and Tracking) or
  pick one? Dual-mode is more complex but matches Actual's
  pattern.
- Schedule → budget pre-fill (already in spec 0007) assumes
  envelope; if we stay tracking-only, that scope bullet needs
  revisiting.
- Interaction with goal templates (idea 0003) — goal-driven
  categories need envelope semantics to work.
- Migration path: the existing `budgets` UI keeps working; flip
  a user preference to opt into envelope mode?
