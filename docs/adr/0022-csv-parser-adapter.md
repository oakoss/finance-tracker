# ADR 0022: CSV Parser Adapter for Future Library Swap

Date: 2026-03-30
Status: Accepted

## Context

PapaParse is used for CSV import parsing (client preview + server
import). We want to eventually support XLSX/ODS imports alongside
CSV. Hucre (`hucre/csv`) covers all three formats in a single
zero-dependency package (~18 KB gzip), but it is too immature to
adopt today (v0.1.0, 3 days old, 192 npm downloads, solo
maintainer, 0.x semver with no stability guarantee).

Rather than couple consumers directly to PapaParse or swap to an
unproven library, we introduce a thin adapter that isolates CSV
parsing behind a stable contract.

## Decision

- Extract a `parseCsvString` adapter at
  `src/modules/imports/lib/parse-csv.ts`.
- All import code imports the adapter, never PapaParse directly.
- PapaParse remains the backend implementation.
- Contract tests at `parse-csv.test.ts` define expected behavior
  (headers, data, error count, BOM, maxRows, empty lines, quoted
  fields). These tests are library-agnostic.
- When Hucre (or another library) matures, swapping the backend is
  a single-file change. Re-running the contract tests validates
  compatibility.

**Decision trigger for completing the swap:** Hucre reaches 1.0,
accumulates meaningful real-world adoption (>10K weekly npm
downloads), or we scope an XLSX/ODS import task that requires a
multi-format library.

## Alternatives Considered

- Swap PapaParse for Hucre now: rejected due to library immaturity
  and risk to financial data parsing.
- Keep PapaParse with no adapter: rejected because it couples all
  consumers directly, making a future swap a multi-file refactor.
- Use SheetJS for multi-format: rejected due to bundle size (~500
  KB) and licensing concerns.

## Consequences

- Positive: Single-file swap path when the time comes. Contract
  tests catch behavioral regressions across library changes.
- Negative: One extra module in the import path (minimal overhead).
- Follow-ups: Re-evaluate Hucre maturity when XLSX/ODS import is
  scoped (see TREK-220).
