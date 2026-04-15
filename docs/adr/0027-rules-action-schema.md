# ADR 0027: Rules Actions Stored as JSONB

Date: 2026-04-13
Status: Accepted
Tracking: EPIC-30 (Rules)

## Context

`merchantRules` today (`src/modules/rules/db/schema.ts`) encodes
two actions as fixed columns: `categoryId` and `payeeId`. Building
a useful rules UI means supporting more actions that Copilot users
rely on:

- Set category
- Set payee
- Set tags (multiple)
- Mark transaction as excluded from budget
- Set transaction type (transfer, refund, reimbursement)
- Add a note

Each additional action column inflates the table, makes "did this
rule actually do anything?" harder to express, and balloons the
ArkType schema. A typed JSONB column fits better.

## Decision

- Replace the fixed `categoryId` and `payeeId` columns on
  `merchantRules` with a single `actions` column of type `jsonb`.
- Validate the `actions` payload via an ArkType schema in
  `src/modules/rules/models.ts`:

  ```ts
  type RuleAction =
    | { kind: 'setCategory'; categoryId: UUID }
    | { kind: 'setPayee'; payeeId: UUID }
    | { kind: 'setTags'; tagIds: UUID[]; mode: 'replace' | 'append' }
    | { kind: 'setExcludedFromBudget'; value: boolean }
    | { kind: 'setNote'; value: string };
  ```

  `setType` is intentionally omitted from v1. The project has
  `transactionDirectionEnum` (`debit`/`credit`) but no broader
  transaction-type enum yet (transfer/refund/reimbursement).
  When that enum lands (spec 0004 adds transfer linking; other
  types follow later), add a `setType` variant in a minor schema
  bump without migration.

  The column stores an array: `RuleAction[]`. One rule can apply
  several actions in one pass.

- Same pattern for `match`: replace `matchType` + `matchValue` with
  a single `match` JSONB that holds the match predicate plus
  optional filters (`amountMin`, `amountMax`, `amountOp`,
  `accountId`, `direction`). Keeps the shape flexible.
- Add a `stage` enum column to `merchant_rules`: `pre`,
  `default`, `post`. Rules run in stage order and, within a
  stage, by `priority` ascending. Default stage for new rules is
  `default`. Borrowed from Actual Budget's three-stage model,
  which their users rely on to express "this rule has to fire
  before / after that one" without juggling priorities by hand.
  The canonical use for the `pre` stage is **descriptor
  normalization**: rules that rewrite raw bank descriptors
  ("SQ \*COFFEE SHOP #12", "AMZN MKTPLACE US") into canonical
  payee references before categorization runs in `default`.
  Payee aliases (ADR 0024) handle the majority of this, but
  merchant-name cleanup rules in the `pre` stage cover cases
  aliases can't express (amount- or account-scoped rewrites).
- Provide a DB-side CHECK constraint that `jsonb_typeof(actions) =
'array'` to catch malformed inserts.
- Application-side: never read `actions` as raw JSON. The rules
  service parses through the ArkType schema on every read and
  treats parse failure as a hard error (corrupted row).

## Alternatives Considered

- **Keep adding fixed columns.** Rejected — every new action is a
  migration and widens the schema.
- **Separate `rule_actions` child table** (one rule → many action
  rows). Rejected — normalized but heavy. Most rules have one or
  two actions, and the ordered-list semantics fit an array better
  than row siblings with a `position` column.
- **Store a stringified DSL** (e.g., `"set category = X; set tag =
Y"`). Rejected — parser complexity with no benefit over JSONB +
  ArkType.

## Consequences

- **Positive**: new actions are additive in application code
  (extend the ArkType union, handle the new `kind`). No migration.
- **Positive**: rules can legitimately apply multiple actions in a
  single rule (set category AND add tag AND mark excluded), which
  Copilot supports and fixed columns would have forced into
  multiple rules.
- **Positive**: the `match` JSONB unlocks amount conditions and
  per-account scoping that users have been asking Copilot for.
- **Negative**: JSONB is opaque to naive SQL queries. Reporting
  "how many rules set a given category?" needs a JSON path query
  (`WHERE actions @> '[{"kind":"setCategory","categoryId":"…"}]'`).
  A GIN index on `actions` is straightforward to add, but it's
  separate from the `(userId, isActive)` b-tree index spec 0002
  already proposes for the apply pass. Plan for two indexes if
  reporting queries land.
- **Negative**: every read must parse. Parse cost on a single rule
  is negligible (few dozen bytes), but the apply-to-existing flow
  runs N rules × M transactions. Memoize the parsed `RuleAction[]`
  per rule for the duration of an apply run rather than
  re-parsing per transaction. Discipline boundary: only the rules
  service touches the raw JSONB.
- **Follow-ups**: the rules spec (`docs/specs/0002-rules-module.md`)
  defines the editor UX, match-condition builder, and
  apply-to-existing flow built on this schema. Recurring rules
  are in scope for a later spec and may or may not reuse the same
  action shape (decided at that spec's time).
