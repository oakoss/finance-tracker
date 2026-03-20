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

## Commands

| Task              | Command                                               |
| ----------------- | ----------------------------------------------------- |
| Dev server        | `pnpm dev`                                            |
| Build             | `pnpm build`                                          |
| Lint              | `pnpm lint`                                           |
| Format            | `pnpm format`                                         |
| Markdown lint     | `pnpm lint:md`                                        |
| Typecheck         | `pnpm paraglide:compile && pnpm typecheck`            |
| All tests         | `pnpm test`                                           |
| Unit tests        | `pnpm test:unit`                                      |
| Integration tests | `pnpm test:integration`                               |
| E2E tests         | `pnpm test:e2e`                                       |
| DB migrate        | `pnpm db:migrate`                                     |
| DB seed           | `pnpm db:seed` (profiles: `minimal`, `stress`, `e2e`) |
| DB start          | `pnpm docker:up`                                      |
| DB logs           | `pnpm docker:logs`                                    |
| DB reset          | `pnpm docker:reset`                                   |
| DB introspect     | `pnpm db:pull`                                        |
| Auth schema       | `pnpm schema:auth`                                    |
| Route tree regen  | `pnpm build` (TanStack Router generates via Vite)     |
| Production start  | `pnpm start`                                          |
| Clean all         | `pnpm clean`                                          |

## Linting

oxlint runs first (native Rust), then ESLint for remaining rules.
Use `oxlint-disable-next-line` for rules owned by oxlint,
`eslint-disable-next-line` for ESLint-only rules. Config:
`.oxlintrc.json` (oxlint), `eslint.config.js` (ESLint).

## Rules That Cause Failures

These are enforced by tooling and will reject code if violated:

- **`perfectionist/sort-objects`**: Object keys must be alphabetically
  sorted (case-insensitive). `createFileRoute` calls are exempt.
- **Commit format**: `type(scope): subject`. Allowed scopes: `auth`,
  `ci`, `config`, `db`, `deps`, `docs`, `email`, `env`, `finance`,
  `i18n`, `infra`, `logging`, `routes`, `scripts`, `tests`, `todos`,
  `tooling`, `ui`. Scope is optional but custom scopes are rejected.
- **Commit body style**: Large changes get a 1-2 sentence summary
  followed by bullet points. Small changes get just bullet points
  (or no body if the subject says it all). Keep bullets concise:
  what changed, not how. No wall-of-text paragraphs.
- **Commit ticket refs**: Do not put ticket IDs in the subject or
  body. Add `Refs: TREK-XX` in the commit footer (after a blank
  line following the body).
- **Kebab-case filenames**: `unicorn/filename-case`.
- **No barrel files**: Import from concrete module paths.
- **Absolute imports**: Use `@/` paths. No parent relative imports.
- **Floating promises**: Every Promise must be awaited, `.catch()`-ed,
  or `void`-ed.
- **Restricted imports** (`no-restricted-imports`):
  - `date-fns` / `@date-fns/tz` — use `@/lib/i18n/date`
  - `lucide-react` — use `@/components/icons`
  - `@base-ui/react` — only in `src/components/ui/` and
    `src/components/filters/`
  - `react-day-picker` — only in `src/components/ui/calendar.tsx`
  - `posthog-js/react` — use `@/hooks/use-analytics`
- **Generated files (do not edit)**:
  - `src/modules/auth/db/schema.ts` (regenerate: `pnpm schema:auth`)
  - `src/routeTree.gen.ts` (auto-generated by TanStack Router)

## Feature Completion

Every feature must ship with: responsive (mobile-first), Paraglide
i18n, empty/loading/error states, toast feedback, type-to-confirm
destructive actions, audit logging, keyboard accessible, server function
tests (TDD), E2E happy-path test.

See [Definition of Done](docs/development/definition-of-done.md).

## Documentation

| Topic                     | Location                                                  |
| ------------------------- | --------------------------------------------------------- |
| Architecture and patterns | [architecture.md](docs/development/architecture.md)       |
| Code standards            | [code-standards.md](docs/development/code-standards.md)   |
| Testing                   | [testing.md](docs/development/testing.md)                 |
| E2E testing               | [e2e/](docs/development/e2e/)                             |
| Database                  | [database.md](docs/development/database.md)               |
| Routing                   | [routing.md](docs/development/routing.md)                 |
| Auth                      | [auth.md](docs/development/auth.md)                       |
| Logging                   | [logging.md](docs/development/logging.md)                 |
| i18n                      | [i18n.md](docs/development/i18n.md)                       |
| Emails                    | [emails.md](docs/development/emails.md)                   |
| Environment               | [env.md](docs/development/env.md)                         |
| CI/CD                     | [workflows.md](docs/development/workflows.md)             |
| Data compliance           | [data-compliance.md](docs/development/data-compliance.md) |
| Components                | [components/](docs/development/components/)               |
| Styling                   | [styling.md](docs/development/styling.md)                 |
| Cookies                   | [cookies.md](docs/development/cookies.md)                 |
| SVG                       | [svg.md](docs/development/svg.md)                         |

## Plan Mode

- Make plans extremely concise. Sacrifice grammar for concision.
- Follow the plan loop: **Plan** -> **Execute** -> **Test** -> **Commit**.
- Plan before writing code. Discuss strategy, align on approach, then
  execute.
- At the end of each plan, list unresolved questions to answer, if any.

## Task Tracking (Trekker)

Local task tracking via Trekker (`.trekker/` is gitignored). Use
`--toon` flag on all commands. Run `trekker ready` before starting work.
Set tasks to `in_progress` then `completed`. Add summary comment before
completing. Search before creating: `trekker search "keyword"`.

## Notes

- Domain: `finance.oakoss.dev` (.com redirects to .dev).
- OAuth apps are separate for local vs prod.
