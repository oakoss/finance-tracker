# Research: Data export in finance apps

Date: 2026-04-10
Related: TREK-70 / EPIC-9

## Summary

Researched data export patterns across YNAB, Monarch Money, Lunch
Money, Actual Budget, and SaaS apps (GitHub, Notion) before
implementing the finance tracker's export feature.

## Format

- CSV is the expected default for finance apps. Users open exports
  in Excel/Google Sheets.
- JSON as secondary for full-fidelity backup and GDPR compliance.
- OFX/QIF only needed for bank import interop (deferred).
- YNAB exports entire budget as CSV. Monarch uses 8-column CSV.

## GDPR Article 20

- Applies to all user-provided data processed by consent/contract.
- Must use structured, commonly used, machine-readable format.
  CSV and JSON both qualify.
- Does not require exporting derived/analytics data.
- Must respond within one month, no fee.
- Encryption required during transmission.

## Community pain points

- YNAB: lose app access after cancellation, only CSV export
- Incomplete exports: missing budgets, categories, rules
- Category hierarchy flattened in CSV
- No single "export all" button — users must export per-entity
- Multi-currency not handled well in exports

## Community wishlist

- One-click full data export (all accounts, history, categories,
  budgets, rules)
- Machine-readable format preserving entity relationships
- Export budgets and rules, not just transactions
- Scheduled/automatic exports for backup
- API access for programmatic export

## UX patterns

- GitHub model: background job → email with download link (for
  large datasets)
- Small exports (<1MB): synchronous download with loading state
- Most personal finance datasets are well under 1MB
- ZIP with one CSV per entity is the cleanest format

## Security

- Audit log every export request
- No re-auth needed for read-only export (less sensitive than
  deletion)
- Exclude internal IDs, hashed passwords, OAuth tokens
- Financial data is sensitive but not regulated PII
