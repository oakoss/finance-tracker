# Spec: Statements Module

Status: draft
Epic: EPIC-33 (Statements)
Date: 2026-04-13

## Context

The `statements` module has DB scaffolding (`statements`,
`attachments`) but no API, services, or UI. Users currently import
transactions via CSV; a statement is a different object: a
periodic summary from the issuer (PDF or CSV) that should be
reconciled against the ledger.

The current schema stores file metadata but none of the summary
math (opening/closing balance, totals, fees, interest) that makes
a statement useful for verification. This spec fills the gap and
defines an upload → parse → reconcile flow. PDF parsing is in
scope for v1 since it's the most common format card issuers
provide.

No ADR required. The remaining design questions (parser strategy,
reconciliation thresholds) live in this spec.

## Scope

**In scope:**

- Upload a statement file (PDF or CSV) tagged to an account and
  period.
- Parse the file to extract summary fields (opening balance,
  closing balance, totals, fees, interest, statement due date,
  minimum payment, new purchases).
- Display a statement detail view with summary, linked
  transactions in the period, and reconciliation status.
- Reconciliation: match period transactions against the
  statement's totals. Flag differences.
- `attachments` CHECK constraint enforcing at least one of
  `transactionId` or `statementId` is set.
- Async parse pipeline (bounded by TREK-196).

**Out of scope:**

- OCR of image-only PDFs (v1 targets text-layer PDFs only).
- Investment-statement parsing (different schema).
- Full statement archival + search (store, link, summarize only).
- Auto-creating transactions from statement line items (users
  already import CSVs for that).

## User flows

### Flow 1: Upload a statement

1. From an account detail page → "Statements" tab → "Upload
   statement".
2. File picker accepts PDF, CSV. 20 MB limit.
3. Form fields: account (prefilled), period start, period end,
   optional statement date, optional note.
4. Client-side hash of the file for dedup. Server refuses a
   re-upload if the same `fileHash` already exists for the user.
5. On save, writes `statements` + `attachments` rows with
   `parseStatus = 'pending'`; enqueues a parse task.

### Flow 2: Parse completes

1. Worker decodes the file, runs the appropriate parser, writes
   summary fields to the `statements` row, flips `parseStatus =
'parsed'`.
2. On parse error, `parseStatus = 'failed'` with `parseError` text;
   user sees a "Parse failed — fill manually" UX on the statement
   detail page.
3. A reconciliation run is kicked off once parse succeeds.

### Flow 3: Reconcile

1. Reconciliation service queries transactions on the account
   within `periodStart..periodEnd` (inclusive).
2. Compares aggregate to parsed totals:
   - `totalDebitsCents` vs. sum of debits.
   - `totalCreditsCents` vs. sum of credits.
   - Closing balance = opening balance + period delta.
3. Writes `reconciledAt`, `reconciliationStatus`, and
   `reconciliationDeltaCents`. Anything above a tolerance
   (default $1) lands as `status = 'mismatch'`.
4. Detail page surfaces mismatches row-by-row with "Why might
   this differ?" explainer (missing transaction, fee, pending
   transaction, currency rounding).

### Flow 4: Fill manually

1. For failed parses or files we don't support yet, user can fill
   the summary fields by hand.
2. UI exposes the summary form directly on the statement detail
   page when `parseStatus = 'failed'` or `'manual'`.

## Data model

### Schema additions to `statements`

| Column                     | Type      | Notes                                                   |
| -------------------------- | --------- | ------------------------------------------------------- |
| `openingBalanceCents`      | integer   | Nullable until parsed                                   |
| `closingBalanceCents`      | integer   | Nullable until parsed                                   |
| `totalDebitsCents`         | integer   | Nullable until parsed                                   |
| `totalCreditsCents`        | integer   | Nullable until parsed                                   |
| `feesCents`                | integer   | Nullable                                                |
| `interestCents`            | integer   | Nullable                                                |
| `statementDueDate`         | timestamp | Nullable (credit card field)                            |
| `minimumPaymentCents`      | integer   | Nullable (credit card field)                            |
| `newPurchasesCents`        | integer   | Nullable (credit card field)                            |
| `parseStatus`              | enum      | `pending`, `parsing`, `parsed`, `failed`, `manual`      |
| `parseError`               | text      | Nullable                                                |
| `reconciledAt`             | timestamp | Nullable                                                |
| `reconciliationStatus`     | enum      | `not_run`, `ok`, `mismatch`, `error`; default `not_run` |
| `reconciliationDeltaCents` | integer   | Nullable                                                |

`fileHash` becomes NOT NULL; required for dedup.

### `attachments` CHECK constraint

```sql
CHECK (transaction_id IS NOT NULL OR statement_id IS NOT NULL)
```

Matches TREK-187's broader CHECK-constraint effort.

### Indexes

- `statements(userId, accountId, periodStart DESC)` for list
  rendering.
- Unique: `(userId, fileHash)` when `fileHash IS NOT NULL` and
  `deletedAt IS NULL` for re-upload dedup.

## API surface

Server functions in `src/modules/statements/api/`:

- `listStatements({ accountId?, limit })` — GET.
- `uploadStatement(input)` — POST, writes pending row + enqueues
  parse task. Returns statement id.
- `getStatement(id)` — GET, includes parsed summary, linked
  transactions, reconciliation result.
- `updateStatementSummary(id, patch)` — POST, used for manual
  filling. Triggers a re-reconciliation.
- `deleteStatement(id)` — POST, soft-delete. Cascades to
  attachments.
- `runReconciliation(id)` — POST, explicit re-run (after manual
  edits or transaction changes).

Parser entry: `parseStatement(statementId)` — called from a Nitro
task, not a server function. Dispatches to `pdf` or `csv` adapter
based on `source`.

## UI

### Account detail page

- New "Statements" tab. Table: period, source (badge PDF/CSV),
  parse status badge, reconciliation badge, actions.
- Empty state with "Upload statement" CTA.

### Statement detail page

- Top: period, source, file link, parse status, reconcile status.
- Summary card: opening → closing, totals, fees, interest, due
  date (if credit).
- Linked transactions list: all transactions within the period on
  the account. Each row gets a reconciliation indicator (matched
  / missing / mismatched amount).
- Actions: re-run reconciliation, edit summary, replace file,
  delete.

### Upload dialog

- Reuses the existing import-upload-dialog pattern
  (`src/modules/imports/components/import-upload-dialog.tsx`).
  Same file validation, account picker, period fields.

## Edge cases

- **Duplicate file upload**: `fileHash` unique index rejects;
  server returns a clear error surfaced as "You already uploaded
  this statement on DATE."
- **Parse fails on a password-protected PDF**: `parseStatus =
'failed'` with a specific error message; user flips to manual
  fill.
- **CSV with preamble rows** (issuer stats, legal text above the
  data grid): reuse the ADR 0022 CSV parser adapter's header
  detection. If detection fails, flip to manual fill.
- **CSV with no header row**: parser emits `parseStatus =
'failed'` with a clear error; users can flip to manual fill.
- **European decimal separators in CSV** (`1.234,56` vs.
  `1,234.56`): parser adapter configures the locale; an open
  question remains about auto-detecting locale from statement
  content.
- **Statement period spans a year boundary**: periodStart/end are
  timestamps; no special-case logic needed.
- **Pending transactions counted by the issuer but not imported
  yet**: reconciliation marks this as a `mismatch` with
  `reconciliationDeltaCents` equal to the pending amount; user
  can dismiss once transactions import.
- **Multiple statements in the same period**: allowed (issuer
  reissues occasionally). Unique index is `(userId, fileHash)`,
  not `(accountId, periodStart, periodEnd)`.
- **User deletes a transaction inside a reconciled period**:
  invalidate `reconciledAt` and flip to `mismatch` on next read
  or re-run. Don't silently retain a stale "ok" state.
- **Very large PDFs** (100+ page business statements): file size
  cap is 20 MB for v1; larger files return a clear error.

## Open questions

- **Parser library choice for PDFs**: candidates include
  `pdf-parse`, `pdfjs-dist`, or shelling out to `poppler`. Node-
  native is simpler to deploy; poppler gives better text
  extraction on messy issuer PDFs. Decide at implementation time
  with a bake-off on sample statements.
- **Per-issuer templates**: issuer PDFs are not standardized. V1
  uses a generic text-layer parser with regex rules for common
  field labels ("Previous balance", "New balance", "Minimum
  payment"). Per-issuer tuned templates (Chase, Amex, Capital
  One, Discover) are a v2 enhancement with community
  contribution.
- **Reconciliation tolerance**: $1 is a pragmatic default to
  absorb currency rounding and cents-level timing drift. Make it
  configurable per-account or per-user?
- **Storage backend for attachments**: current `storageKey` is
  opaque. Local filesystem for self-hosted; S3-compatible for
  hosted. Defer to the attachment-upload infrastructure task
  (TREK-49 Document upload plan).
