# Permissions & Households

Planned permissions model for post-MVP features.

See `docs/adr/0004-better-auth.md` for auth platform choice.

## Household as Organization

- Treat a household as an organization.
- Scope all finance data by `householdId`.

## Roles (proposal)

- `owner`: full control
- `partner`: full edit
- `child`: limited access (read-only or restricted categories)
- `viewer`: read-only

## Notes

- Use Better Auth organization plugin when ready.
- Enforce access in server functions and route middleware.
