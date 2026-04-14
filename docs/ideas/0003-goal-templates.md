# Idea 0003: Goal Templates for Budget Categories

Status: exploring
Date: 2026-04-14

## What

Let users attach a goal to a budget category, expressed as a
first-class row in a new `budget_goals` table rather than parsed
from free-text notes (Actual's mistake). Goal types: `fixed`
(budget this amount monthly), `monthly_average` (average from
prior N months), `percent_of_income`, `target_by_date` (save X by
date), and `remainder_distribution` (split whatever's left).
Each row carries a `params` JSONB matching its type.

## Why

Research 0006 (Actual Budget) identified goal templates as one of
Actual's most-used features; their mini-DSL in category notes is
popular but notes are not structured storage and the community
regularly complains about parser edge cases. A first-class table
is both safer and more queryable (e.g., "show me all categories
with a target_by_date goal falling in Q4").

Depends on idea 0002 (envelope budgeting) — goals don't make
sense without per-month allocations to drive them.

## Open questions

- Goal evaluation cadence: on every budget view or nightly
  recompute?
- `remainder_distribution` precedence: user-specified weights,
  auto-distribute equally, or let the user drag to reshape?
- UI surface: inline on the category row, separate "Goals" tab,
  or both?
- Multi-goal per category: allowed? Probably not for v1.
