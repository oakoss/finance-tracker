# Code Standards

This document captures code style, conventions, and structure expectations.

## Formatting & Linting

- Prettier is required (`pnpm format`).
- ESLint is strict (`pnpm lint` must be clean).
- Markdown lint is enforced (`pnpm lint:md`).
- Use pnpm for scripts; do not use npm in this repo.

## Imports

- Prefer absolute imports via `@/`.
- Avoid barrel files; import directly from module paths.
- `simple-import-sort` enforces ordering.
- No parent relative imports (`import-x/no-relative-parent-imports`).

## Naming & Structure

- Filenames must be **kebab-case**.
- Modules live under `src/modules/*`.
- Shared config lives under `src/configs/*`.
- DB schema aggregator: `src/db/schema.ts`.

## TypeScript

- Use `type` aliases over `interface`.
- Prefer inline type imports.
- Avoid `any` unless necessary.

## React

- React 19 with strict TS.
- `react/jsx-sort-props` is enforced.
- `react-hooks/exhaustive-deps` is off; be intentional with deps.

## UI

- Toast usage: see `docs/development/toasts.md`.

## Error Handling

- Prefer explicit `throw new Error(...)`.
- Avoid `console` in production code unless allowed by overrides.

## File Organization

- Keep files single-purpose; avoid mixing multiple concerns.
- See `docs/development/routing.md` for routing conventions.

## Modules

Recommended per-feature layout (create folders as needed):

```text
src/modules/<feature>/
  api/
  components/
  hooks/
  lib/
  schema.ts
  types.ts
```

Notes:

- Avoid barrel files; import from concrete paths.
- Keep feature UI inside the module; route files should compose it.

Example (users module):

```text
src/modules/users/
  components/
    profile/
      profile-form.tsx
      profile-header.tsx
      profile-stats.tsx
  hooks/
    use-user.ts
  lib/
    user-formatters.ts
  schema.ts
  types.ts
```

## Generated Files

- Do not edit `src/modules/auth/schema.ts`.
- Do not edit route tree generation outputs (e.g., `routeTree.gen`).
