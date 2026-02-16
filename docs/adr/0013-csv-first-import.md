# ADR 0013: CSV-First Import with PDF Fallback

Date: 2026-02-15
Status: Accepted

## Context

Banks and card providers have inconsistent export formats. CSV is the most common and stable option, while QFX/QBO support varies and can be discontinued. PDF statements are a common fallback for older history.

## Decision

- Implement CSV import as the MVP path.
- Keep QFX/QBO out of scope for MVP.
- Add a future PDF statement fallback that can be mapped to CSV or converted via a partner tool.

## Alternatives Considered

- Start with QFX/QBO import support.
- Require direct bank API integration (Plaid/Finicity) for imports.

## Consequences

- Positive: Fast MVP delivery with a format users can already download.
- Negative: CSV mapping UI required; PDF fallback deferred.
- Follow-ups: Re-evaluate QFX/QBO or direct bank APIs post-MVP.
