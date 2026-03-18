---
paths:
  - src/routes/**/*
---

# Route Rules

## Layout route convention

- `_app/` — Authenticated routes. Auth guard via `beforeLoad` + `getSession()` — child routes inherit protection automatically.
- `_auth/` — Public auth pages (login, signup, reset password). Reverse guard redirects authenticated users to `/dashboard`.
- `_public/` — Other public routes. No auth guard at the layout level. Individual routes may add a convenience redirect (e.g., `/` redirects authenticated users to `/dashboard`).

New authenticated routes go under `_app/`. The `authMiddleware` is available for server functions that need session context via middleware chaining, but is not applied at the route level.
