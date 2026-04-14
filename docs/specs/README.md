# Specs

Scoped feature designs that Trekker tasks implement against.

A spec captures the _what_ and _how_ of a feature before code is
written. It lives between ideas (rough concepts) and implementation
(Trekker tasks). Specs are the shared reference that keeps tasks
in an epic aligned.

## Conventions

- File naming: `NNNN-short-title.md`
- Status: `draft` | `approved` | `implementing` | `done`
- One spec per epic or per feature (whichever is more natural).
- Specs reference ADRs for decisions and research docs for context.
- Update the spec as implementation reveals new information.

## What belongs in a spec

- Scope: what's in, what's out
- User flows: step-by-step from the user's perspective
- Data model: tables, fields, relations (if new or changed)
- API surface: server functions, validators, return types
- UI sections: page layout, components, states (loading, empty, error)
- Edge cases and error handling
- Dependencies on other epics or tasks
- Open questions (resolve before implementing)

## What does NOT belong

- Implementation details that only matter to a single file
- Code snippets (those belong in the PR or task comments)
- Research findings (those belong in `docs/research/`)

## Template

Use `docs/specs/0000-template.md` for new specs.

## Index

- `0001-sync-module.md` — pluggable sync adapters (BYO credentials)
- `0002-rules-module.md` — merchant rules + payee aliases with
  rich match/action schema
- `0003-debt-module.md` — payoff planner (snowball / avalanche /
  custom)
- `0004-transfers-module.md` — transfer pairing + auto-detection
- `0005-promotions-module.md` — 0% APR / deferred-interest bucket
  tracking
- `0006-statements-module.md` — statement upload + parse +
  reconciliation
- `0007-recurring-detection.md` — recurring transaction detection,
  scheduling, and auto-link
