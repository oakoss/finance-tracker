# Permissions

Access control model for the finance tracker.

## Current model (MVP)

The app is single-user. All finance data (accounts, transactions,
categories, payees) is scoped to `userId` via foreign keys. Every
authenticated user has full access to their own data and no access to
others'.

Auth is enforced at the `_app/` layout route level. See
`docs/development/auth.md` for the guard and middleware patterns.

## Post-MVP: households

Planned multi-user support uses Better Auth's
[organization plugin](https://www.better-auth.com/docs/plugins/organization)
to model households:

- A household is an organization
- All finance data scoped by `householdId` instead of `userId`
- Access enforced in server functions and route middleware

### Proposed roles

| Role    | Access                                              |
| ------- | --------------------------------------------------- |
| Owner   | Full control, manage members                        |
| Partner | Full edit access to all finance data                |
| Child   | Limited access (read-only or restricted categories) |
| Viewer  | Read-only                                           |

## Notes

- The `account_owner_type` enum (`'personal'` | `'business'`) is a data
  classification field on accounts, not an access control primitive.
- Role-based access will be enforced in server functions, not just at
  the route level.
- See `docs/adr/0004-better-auth.md` for the auth platform choice.
