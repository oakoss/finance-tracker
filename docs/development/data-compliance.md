# Data Compliance

GDPR-compliant data handling. GDPR is the strictest consumer data
regulation; meeting it covers other jurisdictions.

## Soft Delete

All domain data uses soft-delete via the `auditFields` mixin:
`deletedAt`, `deletedById`.

- Soft-deleted records are retained for **30 days**, then permanently
  purged.
- Features with deletable items should show a "Recently Deleted"
  indicator or link.

## Trash View

A dedicated trash page shows soft-deleted items grouped by type
(accounts, transactions, categories, payees, budgets).

- Route: `/_app/profile/trash`
- Accessible from the user profile page ("Your Data" section).
- Actions: restore, permanent delete.
- 30-day retention countdown displayed per item.

## Account Deletion

User account deletion follows a grace period:

1. User initiates deletion from profile page danger zone.
2. **Type-to-confirm** dialog (uses `ConfirmDestructiveDialog`).
3. Prompt to export data before proceeding.
4. **7-day grace period**: user can cancel during this window.
5. Grace period banner shown across the app.
6. After 7 days, account and all associated data are permanently purged.

## Data Export

Users can export their data as CSV or JSON from the profile page.
Covers: accounts, transactions, categories, payees, budgets.

Required before account deletion (GDPR right to data portability).

## Destructive Actions

All destructive actions require type-to-confirm via
`ConfirmDestructiveDialog`:

- Deleting accounts, transactions, categories, payees
- Removing budget targets
- Permanent deletion from trash
- User account deletion
