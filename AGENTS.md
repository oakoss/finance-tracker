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
| Lint              | `pnpm lint`                                           |
| Format            | `pnpm format`                                         |
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

## Epic Planning

- `/tracer-bullets` — decompose epics into vertical slices
  (DB → API → UI → test per slice). Output becomes Trekker tasks.
- `/grill-me` — stress-test a plan or design by walking every
  branch of the decision tree until reaching shared understanding.
  Works at any level: epic design, task plan, or API contract.

## Plan Mode

- Make plans extremely concise. Sacrifice grammar for concision.
- Follow the plan loop: **Plan** -> **Execute** -> **Test** -> **Commit**.
- Plan before writing code. Discuss strategy, align on approach, then
  execute.
- At the end of each plan, list unresolved questions to answer, if any.
- `/tdd` — write tests first during implementation.
- `/improve-codebase-architecture` — identify refactoring
  opportunities when touching existing modules.

### Post-execute checklist

Run in order after finishing implementation:

1. If DB schema changed: `pnpm db:generate` then `pnpm db:migrate`
2. `pnpm format`
3. `pnpm lint`
4. `pnpm typecheck`
5. `pnpm test` (unit + integration)
6. `pnpm test:e2e`
7. `/pr-review-toolkit:review-pr` — fix findings before proceeding
8. `/de-slopify` — remove AI writing/code artifacts
9. `/performance-optimizer` — check for perf issues
10. `/ui-ux-polish` if UI was added/changed
11. Delete plan files from `.claude/plans/`

## Task Tracking (Trekker)

Local task tracking via Trekker (`.trekker/` is gitignored). Use
`--toon` flag on all commands. Run `trekker ready` before starting work.
Set tasks to `in_progress` then `completed`. Add summary comment before
completing. Search before creating: `trekker search "keyword"`.

## Code Standards

@docs/development/code-standards.md

## Feature Completion

@docs/development/definition-of-done.md

## Documentation

@docs/development/architecture.md

See [docs/README.md](docs/README.md) for the full index.
