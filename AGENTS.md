# Agent Guide (Finance Tracker)

TanStack Start (React 19) full-stack finance app with SSR, Nitro v3,
PostgreSQL/Drizzle, Better Auth, Tailwind CSS v4/shadcn.

## Essentials

- **Package manager**: pnpm (not npm).
- **Path aliases**: `@/*` -> `src/*`, `~e2e/*` -> `e2e/*`, `~test/*` -> `test/*`.
- **Validation**: ArkType everywhere (not Zod). Server schema in
  `validators.ts` is the single source of truth — forms import and
  reuse it (or derive via `.pick()` / `.omit()` / `.merge()`).
  - `validators.ts` defines API contracts as independent `type({...})`
    — not derived from Drizzle insert/update schemas.
  - `models.ts` holds ArkType CRUD schemas (select/insert/update/delete)
    and entity type aliases generated via `drizzle-arktype`.
  - Cross-field validation: export `baseSchema` (pickable) +
    `schema` (narrowed). Forms `.pick()` from base schemas.
  - `drizzle-arktype` is used for select/delete schemas only.
  - Import entity types from `@/modules/{mod}/models`, not `db/schema`.
  - Import validators from `@/modules/{mod}/validators`.
- **UI style**: shadcn/ui `base-nova` (Base UI, not Radix). Use
  `render` prop / `mergeProps`, not `asChild`. Icons: Lucide
  via `@/components/icons` (never import `lucide-react` directly).
- **Typography**: Tailwind classes directly on semantic elements. See
  [styling.md](docs/development/styling.md).
- **Restricted imports** (`no-restricted-imports`):
  - `date-fns` / `@date-fns/tz` — use `@/lib/i18n/date`
  - `lucide-react` — use `@/components/icons`
  - `@base-ui/react` — only in `src/components/ui/` and
    `src/components/filters/`
  - `react-day-picker` — only in `src/components/ui/calendar.tsx`
  - `posthog-js/react` — use `@/hooks/use-analytics`

## Commands

| Task              | Command                                               |
| ----------------- | ----------------------------------------------------- |
| Dev server        | `pnpm dev`                                            |
| Build             | `pnpm build`                                          |
| Lint              | `pnpm lint` / `pnpm lint:fix`                         |
| Format            | `pnpm format` / `pnpm format:check`                   |
| Typecheck         | `pnpm paraglide:compile && pnpm typecheck`            |
| All tests         | `pnpm test`                                           |
| Unit tests        | `pnpm test:unit`                                      |
| Integration tests | `pnpm test:integration`                               |
| E2E tests         | `pnpm test:e2e`                                       |
| E2E smoke         | `pnpm test:e2e:smoke`                                 |
| E2E a11y          | `pnpm test:e2e:a11y`                                  |
| E2E stress        | `pnpm test:e2e:stress`                                |
| DB generate       | `pnpm db:generate`                                    |
| DB migrate        | `pnpm db:migrate`                                     |
| DB seed           | `pnpm db:seed` (profiles: `minimal`, `stress`, `e2e`) |
| DB start          | `pnpm docker:up`                                      |
| DB reset          | `pnpm docker:reset`                                   |
| Auth schema       | `pnpm schema:auth`                                    |
| Clean all         | `pnpm clean`                                          |

## Task Workflow

**Never commit proactively.** Complete the full loop, present a
summary, and wait for the user's explicit "commit."

For interactive bug fixes and exploratory work, steps apply as
applicable — skip planning, TDD, and polish when the user is
driving iteration. Checks (step 7) and the commit gate (step 12)
are always required.

1. **Review** — `trekker ready`, check task context, deps, blockers.
   Set task to `in_progress`.
2. **Research** — read relevant files, `docs/`, schemas.
   `/component-patterns` before any UI work.
3. **Plan** — for non-trivial work, align with user. Sacrifice
   grammar for concision. List unresolved questions at the end.
   - `/tracer-bullets` — decompose epics into vertical slices
     (DB → API → UI → test). Output becomes Trekker tasks.
   - `/grill-me` — stress-test a plan or design.
   - `/improve-codebase-architecture` — identify refactoring
     opportunities when touching existing modules.
4. **TDD** — `/tdd` for server functions and business logic.
   Skip for doc-only or config changes.
5. **Implement** — until tests pass.
6. **Update tracking** — Trekker summary comment + status. Update
   docs if needed. Verify bulk edits didn't break formatting.
   Delete plan files from `.claude/plans/`.
7. **Checks** — run in order. Use fix variants to auto-correct
   and fail only on unfixable issues:
   1. If DB schema changed: `pnpm db:generate && pnpm db:migrate`
   2. `pnpm format` (auto-fixes)
   3. `pnpm lint:fix`
   4. `pnpm paraglide:compile && pnpm typecheck`
   5. `pnpm test` (unit + integration)
   6. `pnpm test:e2e`
   7. `pnpm lint:md:fix`
8. **Polish** — `/de-slopify` + `/performance-optimizer` +
   `/ui-ux-polish` if UI changed.
9. **Review** — `/pr-review-toolkit:review-pr`, fix findings.
10. **Re-run checks** if anything changed after polish/review.
11. **Check commit grouping** — one logical change per commit.
    Split when the diff contains independent concerns:
    - Bug fix separate from the refactor it revealed.
    - Schema/migration separate from the code that uses it.
    - Doc/config changes separate from feature code.
    - Test-only changes can stay with their implementation.
    - Lint/format fixups fold into the commit they belong to.
      When in doubt, ask: "could this be reverted independently?"
      If yes, it's a separate commit.
12. **Present summary** — wait for user's "commit."

## Task Tracking (Trekker)

Local task tracking via Trekker (`.trekker/` is gitignored). Use
`--toon` flag on all commands. Run `trekker ready` before starting
work. Set tasks to `in_progress` then `completed`. Add summary
comment before completing. Search before creating:
`trekker search "keyword"`.

## Code Standards

@docs/development/code-standards.md

## Feature Completion

@docs/development/definition-of-done.md

## Documentation

@docs/development/architecture.md

See [docs/README.md](docs/README.md) for the full index.
