# Data Compliance

GDPR-aligned data handling. We target GDPR as the baseline; it covers
most other jurisdictions.

## Soft Delete

All domain data uses soft-delete via the `auditFields` mixin:
`deletedAt`, `deletedById`.

- Soft-deleted records are retained for **30 days**, then permanently
  purged.
- Features with deletable items should show a "Recently Deleted"
  indicator or link.

## Trash View (planned)

A dedicated trash page will show soft-deleted items grouped by type
(accounts, transactions, categories, payees, budgets).

- Route: `/_app/profile/trash`
- Accessible from the user profile page ("Your Data" section).
- Actions: restore, permanent delete.
- 30-day retention countdown displayed per item.

## Account Deletion (planned)

User account deletion will follow a grace period:

1. User initiates deletion from profile page danger zone.
2. **Type-to-confirm** dialog (uses `ConfirmDestructiveDialog`).
3. Prompt to export data before proceeding.
4. **7-day grace period**: user can cancel during this window.
5. Grace period banner shown across the app.
6. After 7 days, account and all associated data are permanently purged.

## Data Export (planned)

Users will be able to export their data as CSV or JSON from the
profile page. Covers: accounts, transactions, categories, payees,
budgets.

Required before account deletion (GDPR right to data portability).

## PostHog Analytics

PostHog collects analytics, error tracking, and session replay data.

### Session replay privacy

Session replay uses the strictest privacy mode (`src/lib/analytics.tsx`):

- `maskAllInputs: true` — all form inputs show `***` in recordings.
- `maskTextContent: true` — all visible text replaced with `***`.
- Network payloads are not recorded.

Recordings show page layout, clicks, and navigation without exposing
financial data. To unmask specific non-sensitive elements (e.g., nav
labels), add the `data-unmask` HTML attribute.

### Data retention

PostHog's free tier retains session recordings for 1 month and
analytics data for 1 year. No financial data is stored in PostHog
(inputs and text are masked before capture).

### Account deletion

When a user's account is purged after the 7-day grace period, their
PostHog person record and associated events must also be deleted via
the PostHog API (`persons-bulk-delete` with `delete_events: true`,
`delete_recordings: true`). This is required for GDPR right to
erasure.

## Destructive Actions

All destructive actions require type-to-confirm via
`ConfirmDestructiveDialog`:

- Deleting accounts, transactions, categories, payees
- Removing budget targets
- Permanent deletion from trash
- User account deletion
