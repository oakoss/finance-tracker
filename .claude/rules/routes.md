---
paths:
  - src/routes/**/*
---

# Route Rules

## Layout route convention

- `_app/` — Authenticated routes. `authMiddleware` is applied at this layout level — child routes do not need to add it individually.
- `_auth/` — Public auth pages (login, signup, reset password). No auth guard.
- `_public/` — Other public routes. No auth guard.

New authenticated routes go under `_app/`. Do not apply `authMiddleware` per-route.
