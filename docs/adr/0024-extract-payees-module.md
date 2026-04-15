# ADR 0024: Extract Payees Into Its Own Module

Date: 2026-04-13
Status: Accepted
Tracking: EPIC-18 (Payees); extraction lives on TREK-242

## Context

The `payees` table currently lives inside
`src/modules/transactions/db/schema.ts` alongside `tags`,
`transactionTags`, and `splitLines`. That was fine when payees were
only referenced by the transaction form. It no longer fits:

- `src/modules/rules/db/schema.ts` and `relations.ts` already import
  `payees` cross-module to define `merchantRules.payeeId`,
  `payeeAliases.payeeId`, and `recurringRules.payeeId` FKs. The
  rules module reaches into the transactions module for one of its
  core concepts.
- `src/modules/auth/db/relations.ts` (which owns `usersRelations`
  because users span modules) imports `payees` to wire up the
  user-scoped relation.
- `src/modules/export/services/gather-user-data.ts` imports `payees`
  (and `tags`, `splitLines`, `transactionTags`) cross-module to
  bundle user data.
- Upcoming modules (sync, recurring detection, merchant cleanup)
  all treat payees as a first-class entity they read and write,
  the same way they treat accounts or categories.
- TREK-57 plans a dedicated Payees CRUD UI (`/_app/payees`). Building
  that page under the `transactions` module makes route colocation
  awkward and reinforces `transactions` as a "god module."

Payees are a user-owned domain entity. The other three tables in
`transactions/db/schema.ts` are different animals: `transactionTags`
is a pure join table, `splitLines` is physically part of a
transaction, and `tags` is arguable but has a narrower external
footprint today. This ADR addresses only `payees`.

## Decision

- Extract `payees` into a new `src/modules/payees/` module.
- Initial layout:

  ```text
  src/modules/payees/
    db/
      schema.ts       # payees table only
      relations.ts    # payees → users, merchantRules, payeeAliases,
                      # recurringRules, transactions
    models.ts         # ArkType select/insert/update/delete + type aliases
  ```

- Re-export `payees` + relations from the aggregator
  `src/db/schema.ts` (already the pattern for every module).
- Update `usersRelations` in `src/modules/auth/db/relations.ts` to
  import `payees` from `@/modules/payees/db/schema`.
- Update every importer of `payees` (today: `rules`, `auth`
  relations, aggregator consumers) to point at the new path.
- `tags`, `transactionTags`, and `splitLines` **stay in the
  `transactions` module** for now. Extracting them is a separate
  decision if/when a future module establishes cross-module demand
  that warrants the move.
- No schema change. No migration. Pure import refactor plus a
  Drizzle relations reorganization. The generated auth schema
  stays untouched — only its relations file is edited.

## Alternatives Considered

- **Leave `payees` in `transactions`.** Cheapest today. Rejected
  because every new module that needs payees either reaches into
  `transactions` (reinforcing the god-module pattern) or re-imports
  via the aggregator in a way that obscures the real dependency.
  The rules module already demonstrates the smell.
- **Extract `payees` + `tags` together.** Tags have similar
  cross-module potential (merchant rules will set tags, future
  reports filter by tag). Rejected for this ADR because tags have
  a narrower external footprint today (auth relations and the
  export service are the only cross-module consumers) and the
  benefit is speculative until a rules "action: set tag" is
  designed. A follow-up ADR can cover tags once that demand is
  concrete.
- **Create a broader "ledger" or "core" module owning shared
  entities.** Rejected as premature abstraction. Domain-specific
  modules (`payees`, `categories`, `accounts`) are the established
  pattern in this codebase.
- **Use barrel files to paper over the coupling.** Rejected — the
  project explicitly forbids barrel files in `AGENTS.md`
  code-standards.

## Consequences

- **Positive**: rules, sync, recurring detection, and future
  merchant cleanup all import `payees` from a domain-appropriate
  path. No cross-module reach into `transactions`.
- **Positive**: TREK-57's Payees CRUD UI gets a natural home.
  Route files under `src/routes/_app/payees.tsx` can colocate with
  the module.
- **Positive**: clarifies the mental model. A transaction
  references a payee; the payee lives on its own.
- **Negative**: one-time refactor touching roughly 4 cross-module
  import sites (rules schema + relations, auth relations, export
  service) plus ~8 intra-module importers inside `transactions/`
  (services, lib, api, models, relations, tests) that must
  retarget to `@/modules/payees/db/schema`. Git history for the
  extracted file has a rename step.
- **Negative**: bigger blast radius than a feature ADR; must land
  as its own commit ahead of any work that assumes the new
  location (spec 0001 already lists this as a prerequisite).
- **Follow-ups**: Trekker task to execute the move, retargeted at
  TREK-57 or a new task ahead of it. Revisit `tags` extraction
  when a concrete cross-module need appears (e.g., when the rules
  module ships a "set tag" action).
- **Open question for the Payees module**: once extracted, does
  the module own merchant-logo resolution and caching? Candidates
  live there naturally — a `payee_logos` cache table keyed by
  payee id, populated on demand from Brandfetch / Clearbit (or a
  user-uploaded override). Defer the decision to the eventual
  Payees CRUD spec (paired with TREK-57); the column shape is
  additive and can land without a further ADR.
