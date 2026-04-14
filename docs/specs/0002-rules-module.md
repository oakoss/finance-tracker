# Spec: Rules Module

Status: draft
Epic: EPIC-TBD (Rules)
Date: 2026-04-13

## Context

The `rules` module has DB scaffolding (`merchantRules`,
`recurringRules`, `payeeAliases`) but no API, services, or UI.
Research (`docs/research/0005-copilot-comparison.md`) identified
rule management as the biggest UX win available: Copilot's top
user complaint is that its rules are create-only. Shipping a
list/edit UI with amount conditions and multi-action rules is a
differentiator.

ADR 0027 locks in the action and match schema (JSONB validated by
ArkType). This spec covers merchant rules and payee aliases.
Recurring rules ship in their own spec paired with detection logic.

## Scope

**In scope:**

- Merchant rules CRUD (list, create, edit, delete, reorder).
- Payee aliases CRUD (scoped to a payee).
- Rich match: contains / starts-with / ends-with / exact / regex,
  amount min/max/op, per-account scope, direction filter.
- Rich actions: set category, set payee, set tags (replace or
  append), set excluded-from-budget, set note. Multiple actions
  per rule.
- Drag-and-drop priority ordering.
- Inline "Create rule from this transaction" action on the
  transactions list.
- "Apply to existing transactions" flow with preview + undo.
- Audit log entries for every mutation and every apply-to-existing
  run.

**Out of scope:**

- `setType` action (defer until a transaction-type enum exists;
  see Data model for details).
- Recurring rule detection and UI (separate spec).
- ML-based "suggest a category" features (beyond scope for v1).
- Rule templates or sharing between users.
- Cross-user rule libraries.

## User flows

### Flow 1: Create a rule from an existing transaction

1. User right-clicks (or opens row actions menu) on a transaction,
   picks "Create rule from this transaction".
2. Dialog prefills: match on merchant/description (contains),
   prefilled action from the transaction's current category and
   payee.
3. User tweaks match predicate + actions, optionally adds amount
   conditions or per-account scope.
4. Preview panel shows the next 20 transactions that would match.
5. On save, user picks "Apply to existing?" Yes → run in
   background, toast on completion with count + undo. No → rule
   only affects future imports.

### Flow 2: Manage rules

1. Settings → Rules tab. Table lists all merchant rules, default
   sort by priority.
2. Drag-and-drop reorder updates `priority`.
3. Toggle `isActive` inline.
4. Edit opens the full editor dialog.
5. Delete is a type-to-confirm destructive action.

### Flow 3: Apply to existing

1. From the rule editor or the rules list row action.
2. Server preview returns affected transaction count + first 50
   rows.
3. User confirms. Server creates an audit run row, mutates
   transactions in a transaction, logs
   `rule.apply-to-existing.v1`.
4. Undo button for 5 minutes — reverses the run via audit data.

### Flow 4: Payee aliases

1. From a payee detail page, "Aliases" section lists known aliases
   (e.g., `AMZN MKTPLACE`, `AMAZON.COM`).
2. Add alias inline. Applies on future imports via the payee
   resolver.

## Data model

### Schema changes to `merchantRules`

Per ADR 0027:

| Column                                                | Type     | Notes                                                         |
| ----------------------------------------------------- | -------- | ------------------------------------------------------------- |
| `id`, `userId`, `priority`, `isActive`, `auditFields` | existing | unchanged                                                     |
| `match`                                               | jsonb    | Replaces `matchType` + `matchValue`. See ArkType schema below |
| `actions`                                             | jsonb    | Array of `RuleAction`. See ADR 0027                           |

CHECK constraints: `jsonb_typeof(actions) = 'array'`,
`jsonb_array_length(actions) > 0`.

Indexes: `(userId, priority)` for list rendering,
`(userId, isActive) WHERE isActive = true` for the apply pass.

### New `rule_runs` table (apply-to-existing audit)

| Column                   | Type      | Notes                                                                                |
| ------------------------ | --------- | ------------------------------------------------------------------------------------ |
| `id`                     | uuid (v7) | PK                                                                                   |
| `ruleId`                 | uuid      | FK → `merchant_rules.id` cascade                                                     |
| `runAt`                  | timestamp | defaultNow                                                                           |
| `affectedTransactionIds` | uuid[]    | array of ids changed in this run                                                     |
| `undoData`               | jsonb     | Per-field before-values and tag-join deltas required to reverse the run. Shape below |
| `undoableUntil`          | timestamp | now + 5 minutes                                                                      |
| `undoneAt`               | timestamp | Nullable                                                                             |
| `auditFields`            | mixin     |                                                                                      |

Indexes: `(ruleId, runAt DESC)`.

`undoData` captures what changed on each transaction so the run
can be reversed field-by-field. ArkType-validated shape:

```ts
type RuleRunUndo = {
  transactions: Array<{
    transactionId: string;
    before: Partial<{
      categoryId: string | null;
      payeeId: string | null;
      note: string | null;
      excludedFromBudget: boolean;
    }>;
    // Tag changes are modeled as join-row deltas, not an array
    // snapshot, so undo is additive/subtractive rather than a
    // full rewrite.
    tagsAdded?: string[]; // tag_ids the run inserted
    tagsRemoved?: string[]; // tag_ids the run deleted
  }>;
};
```

On undo, the service applies `before` values field-by-field,
re-inserts any `tagsRemoved`, and deletes any `tagsAdded`. Rows
not present in `undoData.transactions` are untouched.

### `payeeAliases` — no schema change, just API + UI

Existing shape from ADR 0024 (payees module) suffices.

### ArkType schemas (in `src/modules/rules/models.ts`)

```ts
const matchPredicate = type({
  kind: "'contains' | 'starts_with' | 'ends_with' | 'exact' | 'regex'",
  value: 'string',
  'amountMinCents?': 'number.integer',
  'amountMaxCents?': 'number.integer',
  'amountOp?': "'gte' | 'lte' | 'eq' | 'between'",
  'accountId?': 'string',
  'direction?': "'debit' | 'credit' | 'both'",
});

const ruleAction = type.enumerated(
  { kind: "'setCategory'", categoryId: 'string' },
  { kind: "'setPayee'", payeeId: 'string' },
  { kind: "'setTags'", tagIds: 'string[]', mode: "'replace' | 'append'" },
  { kind: "'setExcludedFromBudget'", value: 'boolean' },
  { kind: "'setNote'", value: 'string' },
);
```

Exact ArkType syntax reconciled at implementation time. `setTags`
mutates rows in the `transaction_tags` join table (not a column on
`transactions`); `mode: 'replace'` deletes existing tag rows before
inserting, `mode: 'append'` adds without deleting.

`setType` is deferred. The codebase has
`transactionDirectionEnum` (`debit`/`credit`) but no broader
transaction-type enum yet; add the action once transfer/refund/
reimbursement types land.

## API surface

Server functions in `src/modules/rules/api/`:

- `listMerchantRules()` — GET.
- `createMerchantRule(input)` — POST, validates match + actions.
- `updateMerchantRule(id, patch)` — POST.
- `reorderMerchantRules(ids)` — POST, replaces priorities in a
  single transaction.
- `toggleMerchantRule(id)` — POST, flips `isActive`.
- `deleteMerchantRule(id)` — POST, soft-delete.
- `previewApply(id)` — GET, returns `{ count, sample: Transaction[] }`.
- `applyToExisting(id)` — POST, writes `rule_runs` row and mutates
  transactions inside a single DB transaction.
- `undoRuleRun(runId)` — POST, valid within `undoableUntil`.
- Payee aliases: `listAliases(payeeId)`, `createAlias(input)`,
  `deleteAlias(id)`.

## UI

### Rules list page (`/_app/rules`)

- Tabs: Merchant rules | Payee aliases.
- Merchant rules table: columns for match preview, action preview
  (chips), priority handle, isActive toggle, row actions (edit,
  apply to existing, delete). Empty state with CTA.
- Drag handle on the left reorders via `reorderMerchantRules`.
- Filter bar: search by match string, filter by action kind.

### Rule editor dialog

- Left pane: match builder. Dropdown for `kind` + text input for
  `value`. Collapsible "Advanced" reveals amount conditions,
  account scope, direction.
- Right pane: actions builder. "Add action" button opens a popover
  with the action kinds; each added action becomes a card with
  action-specific inputs.
- Bottom: preview of next 20 future-import matches (live as the
  user edits).
- Footer: Cancel / Save + "Apply to existing" checkbox.

### Transaction list integration

- Row action "Create rule from this transaction" opens the editor
  prefilled.
- Transactions that match an active rule show a subtle rule icon.

## Edge cases

- **Regex match on import-heavy load**: cap regex execution via
  `ArkType` validators (length limit + precompile + timeout on the
  apply-to-existing path); log and skip rules that time out.
- **Conflicting rules**: first matching rule by priority wins. UI
  surfaces "earlier rule already matches this transaction" hint in
  the preview.
- **Undo window expiry**: disabled button with tooltip "Undo
  expired at X" after `undoableUntil`.
- **Apply to existing on a huge history**: server-side stream in
  batches of 500 and write progress to the `rule_runs` row.
- **Deleting a category/payee referenced by a rule action**:
  rules' FKs are conceptual (actions stored in JSONB). On delete
  of a category, the rules service surfaces "N rules reference
  this category — remap or delete them first" (matches existing
  categories deletion UX).
- **Alias collisions**: two payees with the same alias for the
  same user is a validation error at create time.
- **Apply runs overlapping on the same transactions**: if rule A's
  apply run is still within its 5-minute undo window and rule B's
  run modifies some of the same transactions, undoing A would
  also revert B's changes. Two cases to cover:
  1. **Concurrent** (both running at once) — serialize per-user
     apply runs via an advisory lock keyed on `userId` so only one
     apply run executes at a time.
  2. **Sequential** (A finished, B ran later, both touched the
     same rows within A's undo window) — when computing undo,
     check whether any rows in A's `affectedTransactionIds` have
     been touched by a later run. If yes, disable A's undo with
     a tooltip "Another rule run touched these rows; undo would
     overwrite it." Stored in `rule_runs.undoData` which captures
     per-field before-values so we can detect collisions.

## Open questions

- **Priority semantics**: sparse integers (10, 20, 30) to ease
  reorders vs. dense 1..N re-numbered on each reorder. Dense is
  simpler, but sparse avoids rewriting every row on a drag.
  Probably dense for v1 given expected rule count (<50 per user).
- **"Apply to existing" as default**: opt-in checkbox in the editor
  or a separate explicit flow? Opt-in is safer; users who want it
  have one click.
- **Rule simulator**: a "what would happen if I ran all active
  rules right now?" batch preview. Useful but could be a follow-
  on. Defer to v2.
