---
paths:
  - src/configs/env.ts
  - .env.example
---

# Environment Variable Rules

- Schema is defined with ArkType via `arkenv` — not Zod.
- `env` is a lazy proxy that validates on first property access. Do not call `arkenv()` directly.
- Set `SKIP_ENV_VALIDATION=true` to bypass validation in CI builds.
- Optional vars use `'KEY?'` syntax. Defaults use `= 'value'` in the ArkType string.
- Client-side vars must use the `VITE_` prefix to be available via `import.meta.env`.
- When adding a new env var: update both `src/configs/env.ts` (schema) and `.env.example` (dummy value).
