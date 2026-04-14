# Ideas

Rough concepts and explorations before committing to scope.

Ideas are cheap — write one whenever a thought surfaces during
implementation, code review, or user feedback. Most ideas will be
discarded or merged into an existing epic. That's fine.

## Conventions

- File naming: `NNNN-short-title.md`
- Status: `exploring` | `validated` | `parked` | `rejected`
- Keep it short: 1-2 paragraphs max. If it needs more detail, it's
  a spec.
- Link to the Trekker task or epic if one exists.

## Lifecycle

1. Write the idea.
2. Discuss with the team or stress-test with `/grill-me`.
3. If validated, promote to a spec (`docs/specs/`) or create an ADR
   if it's a decision.
4. If parked, leave it — it may become relevant later.
5. If rejected, mark status and add a one-line reason.

## Template

Use `docs/ideas/0000-template.md` for new ideas.

## Index

- `0001-net-worth-history.md` — historical net worth chart +
  balance snapshots table
- `0002-envelope-budgeting.md` — envelope/zero-based semantics
  for the budgets module (ADR candidate)
- `0003-goal-templates.md` — first-class `budget_goals` table
  (depends on envelope)
- `0004-wishlist.md` — small standalone "planned spending"
  module
- `0005-household-access.md` — multi-user shared ledger
  (EPIC-27; epic-level design)
