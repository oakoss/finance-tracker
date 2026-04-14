# Spec: Recurring Transaction Detection and Scheduling

Status: draft
Epic: EPIC-TBD (Recurring)
Date: 2026-04-14

## Context

The `rules` module has scaffolding for `recurring_rules` (id,
userId, name, interval, nextRunAt, amountCents, accountId,
categoryId, payeeId, description) but no detection service, no UI,
and no connection to budgets or the transactions list. Research
(`docs/research/0005-copilot-comparison.md`) and
`docs/research/0006-oss-budget-apps.md` both flagged recurring
detection as a high-leverage quick win. Copilot uses it to flag
forgotten subscriptions and pre-fill budgets; Actual uses it to
link imported bank transactions to scheduled entries.

Spec 0002 (Rules) explicitly deferred recurring to its own spec.
This is that spec.

The word "rule" is doing double duty in this module: merchant
rules (spec 0002) are apply-on-import transformations with a
`match` predicate and an `actions` array; recurring rules (this
spec) are scheduled-event definitions with `nextRunAt` and
interval semantics. The ADR 0027 three-stage model (`pre` /
`default` / `post`) applies to merchant rules only; recurring
rules have no stage or action composition.

## Scope

**In scope:**

- Heuristic detection over transaction history: same merchant /
  payee, similar amount (±tolerance%), regular cadence.
- CRUD for `recurring_rules` with richer recurrence:
  approximate-amount flag, weekend-adjust, day-of-month /
  day-of-week, end conditions, workflow mode, "Common" pinning.
- Auto-link: imported / synced transactions that match an active
  recurring rule within ±N days and tolerance % get linked.
- Dashboard widget: "Upcoming bills" within a configurable window.
- Transaction-row "Create recurring rule from this transaction"
  action.
- Detection candidate review queue (suggestions, user confirms).
- Budget pre-fill: for categories that have active recurring
  rules, the sum of scheduled amounts is offered as a starting
  monthly budget.

**Out of scope:**

- Auto-creating transactions for scheduled-but-unposted runs
  (workflow mode is `post-with-approval` only in v1; auto-post
  mode is a follow-up).
- Predicting _new_ recurring rules via ML (v1 is pure heuristic).
- Multi-currency rules (v1 assumes a rule's amount is in the
  linked account's currency).
- Subscription-cost analysis ("you spend $X/month on
  subscriptions"): belongs in reports.

## User flows

### Flow 1: Detection suggests a recurring rule

1. A background detection pass runs daily (Nitro task) and after
   every import/sync commit. It scans the user's last 6 months of
   transactions.
2. For each candidate group (same payee, same sign, ≥3
   occurrences within a narrow amount band, regular interval),
   write a `recurring_candidates` row with heuristic-inferred
   fields.
3. User sees a banner on the transactions page: "N possible
   recurring charges detected." Opens a review drawer.
4. Each candidate shows the inferred schedule (interval + next
   expected date) and the matching transactions. Actions:
   Confirm (promotes to `recurring_rules`, marks transactions as
   linked), Skip (dismiss for 30 days), Not recurring (persist
   dismiss).

### Flow 2: Manage recurring rules

1. Settings → Recurring tab (or `/_app/recurring` route).
2. Table lists active rules. Columns: name, payee, category,
   amount (± tolerance if approximate), cadence, next expected
   date, isCommon toggle, isActive toggle, row actions.
3. "Common" rows pin to the top of the list. Useful for rent,
   utilities, and paychecks: the bills users want always visible.
4. Edit opens the full editor dialog.

### Flow 3: Upcoming widget

1. Dashboard widget shows active recurring rules with
   `nextRunAt` within `upcomingWindowDays` (default 14, range
   1–60).
2. Each row shows the rule name, amount, days-until, and a
   status indicator: pending, posted-this-cycle, skipped.
3. Click a row → detail view with schedule history and linked
   transactions.

### Flow 4: Auto-link on import / sync

1. After every commit of imported transactions, a post-commit
   hook runs the auto-link pass over the affected user's active
   recurring rules.
2. For each rule with `nextRunAt` within `autoLinkWindowDays`
   (default 4, mirrors Actual's ±2 days), find the closest
   matching transaction (payee match + amount within tolerance).
3. If found, link it: write `recurring_rule_id` onto the
   transaction row, advance the rule's `nextRunAt` to the next
   occurrence. Advancement uses a compare-and-swap
   (`UPDATE ... WHERE nextRunAt = $oldNextRunAt`) so concurrent
   auto-link passes from two imports can't double-advance. The
   loser retries against the new `nextRunAt`.
4. Before linking, check `recurring_skips` for the candidate
   cycle: reject matches whose posted date falls within a skipped
   window `[originalDueDate - gracePeriodDays, originalDueDate +
gracePeriodDays]`. Late transactions for skipped cycles don't
   silently link to the current cycle.
5. If no match found by `nextRunAt + gracePeriodDays`, flag the
   rule as `overdue` in the widget. Overdue rules remain eligible
   for auto-link until the next scheduled cycle starts
   (`nextRunAt_current + intervalDays`); a match after that
   window requires manual linking.

### Flow 5: Skip next occurrence

1. From the upcoming widget or rule detail, "Skip next" action
   advances `nextRunAt` past the current cycle without linking a
   transaction. Writes `recurring_skips` row for audit.

## Data model

### Schema additions to `recurring_rules`

| Column                    | Type      | Notes                                                                                                                                                                                                                               |
| ------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isActive`                | boolean   | default true; false pauses detection and auto-link                                                                                                                                                                                  |
| `isCommon`                | boolean   | default false; "common" bills pin to the top of the list                                                                                                                                                                            |
| `isAmountApproximate`     | boolean   | default false; when true, tolerance applies on match                                                                                                                                                                                |
| `amountToleranceBp`       | integer   | Basis points (1bp = 0.01%). Default 750 = 7.5%. Applied as `±(amountCents * toleranceBp / 10000)`                                                                                                                                   |
| `weekendAdjust`           | enum      | `none`, `before`, `after`; default `none`. When the computed date lands on a Sat/Sun, shift accordingly                                                                                                                             |
| `dayOfMonth`              | integer   | Nullable; for monthly/quarterly/yearly. 1–31, or `-1` for "last day"                                                                                                                                                                |
| `dayOfWeek`               | enum      | Nullable; `mon`..`sun`; for weekly/biweekly                                                                                                                                                                                         |
| `endDate`                 | timestamp | Nullable; rule stops firing past this date                                                                                                                                                                                          |
| `endAfterOccurrences`     | integer   | Nullable; alternative terminator                                                                                                                                                                                                    |
| `occurrenceCount`         | integer   | default 0; increments on each auto-linked occurrence                                                                                                                                                                                |
| `workflowMode`            | enum      | `post-with-approval`, `detect-only`; default `post-with-approval`. `auto-post` is a v2 addition                                                                                                                                     |
| `customIntervalDays`      | integer   | Nullable. Required when `interval = 'custom'`; supplies the day-count that advances `nextRunAt` for non-canonical cadences (e.g. a 20-day reload). Null when `interval` is one of the canonical enum values                         |
| `gracePeriodDays`         | integer   | Per-rule; default 5 (covers typical ACH settlement). Days after `nextRunAt` before the rule is flagged `overdue`. The rule remains eligible for auto-link past the grace period until the next scheduled cycle advances `nextRunAt` |
| `lastLinkedTransactionId` | uuid      | Nullable FK → `transactions.id` set null. **Denormalized cache** of `MAX(postedAt)` over transactions with this `recurringRuleId`; may lag between auto-link runs. Read-only outside the auto-link service                          |

Existing columns (`id`, `userId`, `name`, `interval`, `nextRunAt`,
`amountCents`, `accountId`, `categoryId`, `payeeId`,
`description`, `auditFields`) stay.

CHECK: `amountToleranceBp BETWEEN 0 AND 5000` (0% to 50%;
larger tolerances produce meaningless matches). Also:
`(interval = 'custom') = (customIntervalDays IS NOT NULL)` so a
custom cadence always has a day count and canonical intervals
never carry a stray one.

Indexes: `(userId, isActive) WHERE isActive = true` for the
detection and upcoming-widget passes; `(userId, nextRunAt) WHERE
isActive = true` for the upcoming window.

**Per-rule vs per-user settings**: `gracePeriodDays`,
`amountToleranceBp`, `weekendAdjust`, and `workflowMode` are
per-rule columns above. `upcomingWindowDays` (default 14) and
`autoLinkWindowDays` (default 4) are per-user preferences stored
on `user_preferences`, not columns on this table.

### New `recurring_candidates` table

Detection output awaiting user confirmation.

| Column                       | Type      | Notes                                                                                                                                                                                                |
| ---------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                         | uuid (v7) | PK                                                                                                                                                                                                   |
| `userId`                     | uuid      | FK → `users.id` cascade                                                                                                                                                                              |
| `inferredPayeeId`            | uuid      | FK → `payees.id` set null                                                                                                                                                                            |
| `inferredCategoryId`         | uuid      | FK → `categories.id` set null                                                                                                                                                                        |
| `inferredAmountCents`        | integer   | Median of the matching transactions                                                                                                                                                                  |
| `inferredInterval`           | enum      | `recurrenceIntervalEnum`                                                                                                                                                                             |
| `inferredCustomIntervalDays` | integer   | Nullable. Set when `inferredInterval = 'custom'`; mirrors `recurring_rules.customIntervalDays` so promoting a candidate carries the cadence forward                                                  |
| `inferredNextRunAt`          | timestamp | Projected from the pattern                                                                                                                                                                           |
| `inferredDescriptorHash`     | text      | Stable hash of the raw descriptors on `sampleTransactionIds` (e.g. first 32 chars of normalized raw text, sha256-hashed). Used in the upsert key to dedupe candidates when `inferredPayeeId` is null |
| `sampleTransactionIds`       | uuid[]    | array of the transactions that matched. Not FK-enforced; relies on soft-delete-only policy for transactions — verify before hard-delete                                                              |
| `confidence`                 | enum      | `high`, `medium`, `low` (thresholds below)                                                                                                                                                           |
| `status`                     | enum      | `pending`, `confirmed`, `dismissed`; default `pending`                                                                                                                                               |
| `dismissedUntil`             | timestamp | Nullable; set when `status = 'dismissed'` with a TTL                                                                                                                                                 |
| `auditFields`                | mixin     |                                                                                                                                                                                                      |

Detection pass is an **upsert** keyed on the expression
`(userId, COALESCE(inferred_payee_id::text, ''), inferred_amount_cents,
inferred_interval, inferred_descriptor_hash) WHERE status = 'pending'`.
The COALESCE plus `inferredDescriptorHash` are required because
PostgreSQL treats `NULL` values as distinct in plain unique
indexes, and imports without a resolved payee would otherwise
insert a fresh `pending` row on every detection pass. On rerun:
if the candidate already exists and is `pending`, refresh
`sampleTransactionIds`, `inferredNextRunAt`, and `confidence`.
Rows with `status = 'confirmed'` (already promoted to
`recurring_rules`) or `status = 'dismissed'` (within
`dismissedUntil`) are not re-suggested. Once `dismissedUntil`
expires, the next pass may re-suggest with a new row.

Confidence thresholds (numeric definitions):

- `high`: ≥6 occurrences, cadence stddev <15% of median, amount
  stddev <5% of median.
- `medium`: ≥4 occurrences, cadence stddev <25%, amount stddev
  <10%.
- `low`: ≥3 occurrences, anything looser.

Interval classification: compute median delta between consecutive
occurrences; round to the nearest canonical interval (7 / 14 /
30 / 91 / 365 days) but only accept the match if stddev is under
the confidence threshold for that bucket. 28–31 day medians
resolve to `monthly`; 13–15 day medians to `biweekly`; ambiguous
cases (16–27 day median) are classified as `custom` with an
explicit `inferredCustomIntervalDays` set to the median delta.
Promoting a custom candidate to `recurring_rules` copies this
value into `customIntervalDays`.

Also note: `inferredInterval = 'custom'` without a non-null
`inferredCustomIntervalDays` is rejected by the same CHECK
constraint style as `recurring_rules`.

### New `recurring_skips` table

Audit trail for user-skipped occurrences.

| Column            | Type      | Notes                                 |
| ----------------- | --------- | ------------------------------------- |
| `id`              | uuid (v7) | PK                                    |
| `ruleId`          | uuid      | FK → `recurring_rules.id` cascade     |
| `skippedAt`       | timestamp | defaultNow                            |
| `originalDueDate` | timestamp | The `nextRunAt` value before the skip |
| `reason`          | text      | Nullable user note                    |
| `auditFields`     | mixin     |                                       |

### New column on `transactions`

| Column            | Type            | Notes                                                                           |
| ----------------- | --------------- | ------------------------------------------------------------------------------- |
| `recurringRuleId` | uuid (nullable) | FK → `recurring_rules.id` set null. Set when auto-linked or manually associated |

Partial index: `(recurringRuleId) WHERE recurringRuleId IS NOT
NULL` for the "show linked transactions" query.

## API surface

Server functions in `src/modules/rules/api/` (same module; the
`rules` module owns both merchant rules and recurring):

- `listRecurringRules({ includeInactive?: boolean })` — GET.
- `createRecurringRule(input)` — POST, validates the recurrence
  and end conditions.
- `updateRecurringRule(id, patch)` — POST.
- `toggleActive(id)` / `toggleCommon(id)` — POST, small flips.
- `deleteRecurringRule(id)` — POST, soft-delete.
- `listUpcoming({ windowDays? })` — GET, rules with
  `nextRunAt` inside the window plus their latest linked
  transaction.
- `skipNext(id, { reason? })` — POST, advances `nextRunAt` past
  the current cycle, writes a `recurring_skips` row.
- `linkTransaction(ruleId, transactionId)` — POST, manual
  association; advances `nextRunAt` if appropriate.
- `unlinkTransaction(transactionId)` — POST, clears
  `recurringRuleId`.
- Detection entry: `runDetection(userId, { historyDays })` —
  Nitro task, not a server function. Post-commit hook on
  imports / sync calls it.
- Candidate review: `listCandidates()`,
  `confirmCandidate(id, overrides)`,
  `dismissCandidate(id, duration)`.

## UI

### Recurring rules list (`/_app/recurring`)

- "Common" rows pinned at top, visually distinct.
- Columns: name, payee, category, amount (± tolerance chip if
  approximate), cadence, next due, status (pending, linked,
  overdue), actions.
- Search + filter by status.
- Review banner at the top when candidates exist.

### Rule editor dialog

- Basic tab: name, payee, category, account, amount,
  approximate-amount toggle + tolerance.
- Schedule tab: interval, day-of-month / day-of-week (as
  applicable), weekend-adjust, end conditions, next expected
  date picker.
- Advanced tab: workflow mode, grace period, isCommon toggle.

### Upcoming widget (dashboard)

- Configurable window (setting; default 14 days). Sorted by
  due date ascending.
- Row actions: Skip next, View rule.
- Empty state: "No upcoming bills in the next X days."

### Candidate review drawer

- Opens from the "N possible recurring charges" banner.
- Each candidate shows the inferred schedule and the matching
  transactions side-by-side. Confirm / Skip 30 days / Not
  recurring.

### Transactions list integration

- Linked transactions show a recurring badge with hover showing
  the rule name.
- Row action "Link to recurring rule" / "Unlink from recurring
  rule" depending on state.

## Edge cases

- **Gap in history** (user skipped a month): detection treats ≥3
  occurrences within a 6-month window as sufficient; gaps don't
  disqualify unless cadence drift > 25%.
- **Amount drift over time** (rent increase): tolerance is
  percent-based, so small drift absorbs. Large jumps break the
  link and surface as "overdue + no match" in the widget.
- **Multiple candidates for the same transaction**: detection
  picks the closest amount + cadence match. Ties broken by most
  recent occurrence count.
- **Rule's account is closed**: auto-link pauses; the rule flips
  to `isActive = false` with an audit note. User must relink to
  another account.
- **Skip then late import**: if the user skips a due cycle and a
  matching transaction imports afterwards, the auto-link pass
  checks `recurring_skips.originalDueDate ± gracePeriodDays`
  before linking. A match inside a skipped window is rejected so
  the transaction doesn't silently absorb into the _current_
  cycle either. Manual `linkTransaction` still works if the user
  insists.
- **End conditions reached**: `isActive` flips to false on the
  next pass. Rule stays in history; user can reactivate.
- **Approximate amount + large tolerance**: tolerance capped at
  50% to prevent nonsensical matches.
- **Currency mismatch** between rule and account: v1 requires
  them to match; UI surfaces a validation error at rule save.
- **Paychecks (income-direction recurring)**: fully supported.
  `amountCents` semantics follow the linked account convention;
  detection uses the sign of the transactions.

## Open questions

- **Workflow mode `auto-post`**: should we add a "create a
  transaction automatically on `nextRunAt`" mode? Risky (wrong
  projections mislead users); defer to v2 once we've measured
  detection accuracy.
- **Subscription-audit report**: once this ships, there's a
  natural "you're spending $X/month on recurring charges"
  derived view. Belongs in the reports epic (TREK-28).
- **Detection cadence inference**: hard cases like "paid every
  other Thursday" fall into the biweekly bucket but off-by-one
  day drift is common. Tolerance window around `nextRunAt` is
  the pressure valve; revisit if users hit it.
- **Budget pre-fill integration**: exact UX: auto-apply or
  suggest? Suggest-and-confirm feels safer in v1.
