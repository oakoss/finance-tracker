# Architecture

TanStack Start (React 19) full-stack app with SSR, file-based routing,
and Nitro v3 as the server runtime. PostgreSQL via Drizzle ORM. Better
Auth for authentication. Tailwind CSS v4 with an extended shadcn/ui
component library.

## Data Flow Pattern

Server functions use `createServerFn` from `@tanstack/react-start`:

```ts
const getData = createServerFn({ method: 'GET' }).handler(async () => {
  const result = await db.query.table.findMany();
  log.info({ action: 'entity.list', outcome: { count: result.length } });
  return result;
});

const createData = createServerFn({ method: 'POST' })
  .inputValidator((data: { name: string }) => data)
  .handler(async ({ data }) => {
    try {
      await db.insert(table).values(data);
      log.info({ action: 'entity.create', outcome: { success: true } });
      return { success: true };
    } catch (error) {
      throw createError({
        cause: error instanceof Error ? error : new Error(String(error)),
        fix: 'Check the database connection and try again.',
        message: 'Failed to create entity.',
        status: 500,
        why: error instanceof Error ? error.message : String(error),
      });
    }
  });

export const Route = createFileRoute('/path')({
  component: Component,
  loader: async () => await getData(),
});
```

Key patterns:

- `.inputValidator()` for request validation, `.handler()` for logic.
- `createError()` from `@/lib/logging/evlog` for structured errors
  (`message`, `status`, `why`, `fix`, `cause`).
- Log with `log.info()` using `action`/`outcome` structure.
- Route `loader` for SSR data fetching. Client-side mutation: call
  server function, then `void router.invalidate()`.
- TanStack Query is wired via `setupRouterSsrQueryIntegration` (handles
  dehydration, hydration, and `QueryClientProvider` wrapping). Use
  `context.queryClient.ensureQueryData()` in loaders for pre-populated
  cache, `useQuery()`/`useMutation()` in components.
- `@tanstack/react-form` for forms with ArkType validation.

## State Management Hierarchy

In priority order:

1. **URL search params** (TanStack Router): Filters, pagination,
   sorting, modal open/close, active tabs. State that should survive
   refresh, be shareable, or work with back/forward. Define with
   `validateSearch` + ArkType, read via `Route.useSearch()`. Debounce
   text input writes with `useDebouncedCallback` from
   `@tanstack/react-pacer`.
2. **Server state** (TanStack Query): Remote data fetching, caching,
   mutations, optimistic updates. Use `useQuery()`/`useMutation()` in
   components, `context.queryClient.ensureQueryData()` in loaders.
3. **Global client state** (Zustand): Client-only state that spans
   multiple routes and does not belong in the URL. Stores live in
   `src/stores/`. Use `create<T>()(...)` (double-parentheses pattern).
   Prefer slices over monolithic stores.
4. **Form state** (TanStack Form): All form input values, validation,
   and submission. Do not use `useState` for form fields.
5. **Local component state** (`useState`, `useReducer`): Ephemeral
   state scoped to a single component: hover/focus, animations, loading
   spinners, UI toggles.
6. **Context/Provider**: Dependency injection and config only.
   Frequently changing state in context re-renders all consumers.
   Theme is handled by `next-themes`.

## Storage Convention

Where to persist client-side state:

1. **Cookies**: SSR-safe persistence (sidebar collapsed, theme,
   locale). Use `createClientCookies()` / `createServerCookies()` from
   `@/lib/cookies`. Zustand persist middleware should target cookies when
   SSR matters.
2. **Memory**: Everything else (Query cache, form state, component
   state, Zustand stores without persistence). Default choice.
3. **IndexedDB**: Reserved for future large-data needs (offline mode).
   Will be managed via TanStack DB when added.

**Do not use `localStorage` or `sessionStorage`.** Cookies cover
SSR-safe persistence; memory covers the rest.

## Module Organization

`src/modules/` contains domain-specific code:

```text
src/modules/{module}/
  api/           Server fns — auth, validation, error mapping, logging
  services/      Business logic — orchestration, mutations, audit logging
  lib/           Domain helpers — reusable DB utilities (resolve-payee, etc.)
  db/            Drizzle tables, enums, indexes, relations
  models.ts      ArkType select/insert/update/delete schemas + entity types
  validators.ts  API contract validation schemas with business rules
```

- **`api/`** — thin handler: `requireUserId` -> call service -> log
  -> return. No business logic.
- **`services/`** — pure business logic: accepts `db: Db` + `userId`
  \+ `data`, wraps in `db.transaction()`, does authorization checks,
  mutations, audit logging. Tested directly in integration tests.
- **`lib/`** — domain helpers that aren't full services (e.g.,
  `resolve-payee`, `resolve-tags`). Accept `tx: DbOrTx`, no
  transaction management.
- **`db/`** — Drizzle tables, enums, indexes, relations only.
- **`models.ts`** — ArkType CRUD schemas (`*SelectSchema`, etc.)
  and entity type aliases (`User`, `LedgerAccount`, etc.).
- **`validators.ts`** — API contract schemas with business rules
  (create/update/delete input validation).
- **`constants.ts`** — Shared constants used across subdirectories
  within the module (e.g., channel names, enum values). Lives at
  the module root, not nested in `hooks/` or `lib/`.

Modules:

- **auth**: `api/`, `db/` (generated schema, do not edit, relations),
  `models.ts`, `emails/` (React Email templates, rendering, sending),
  `hooks/` (e.g., `use-sign-out.ts`), `lib/`, `middleware.ts`
- **transactions**: `api/`, `services/`, `lib/`, `db/`, `models.ts`,
  `validators.ts`
- **accounts**: `api/`, `services/`, `db/`, `models.ts`,
  `validators.ts`, `hooks/`, `components/`
- **categories**: `api/`, `services/`, `db/`, `models.ts`,
  `validators.ts`, `hooks/`, `components/`
- **debt**: `db/`, `models.ts` (debt strategies, order, runs)
- **budgets**: `api/`, `services/`, `db/`, `models.ts`,
  `validators.ts`, `hooks/`, `components/`
- **imports**: `api/`, `services/`, `lib/`, `db/`, `models.ts`,
  `validators.ts`, `hooks/`, `components/`
- **preferences**: `db/`, `models.ts` (user preferences)
- **promotions**: `db/`, `models.ts` (promos, buckets, bucket txns)
- **rules**: `db/`, `models.ts` (recurring rules, merchant rules,
  payee aliases)
- **statements**: `db/`, `models.ts` (statements, attachments)
- **transfers**: `db/`, `models.ts`

Each module owns its Drizzle schema and relations in `{module}/db/`.
All are re-exported through `src/db/schema.ts` (the aggregator).
Global infra tables live in `src/db/` directly: `audit.ts` (auditLogs
table + enum), `audit-relations.ts`, `audit-models.ts`.

**Relations pattern:** Drizzle requires exactly one `relations()` call
per table. `usersRelations` lives in `src/modules/auth/db/relations.ts`
since `users` is an auth table -- it consolidates relations spanning
all modules.

Server functions live in `src/modules/{module}/api/`. Import from there
rather than defining inline in route files.

## App Layout System

Composable layout components live in `src/components/layouts/`:

### Building blocks (`layouts/app/`)

- `app-header.tsx` -- Top header bar with sidebar trigger, page title
  slot, and user context (notification bell, theme toggle, avatar
  dropdown with Profile, Preferences, Keyboard Shortcuts, Sign Out)
- `app-sidebar.tsx` -- Collapsible sidebar with finance navigation:
  Dashboard, Accounts, Transactions, Categories, Payees, Imports,
  Budget, Debt Strategy. Collapses to icon rail with tooltips
  (`collapsible="icon"` mode). All flat links, no sub-menus.

### Shell compositions (`layouts/shells/`)

- `sidebar-shell.tsx` -- `SidebarProvider` + `AppSidebar` +
  `SidebarInset`. Used by `_app/` layout.
- `default-shell.tsx` -- Session-aware header + content area. Used by
  `_public/` and `_auth/` routes.

### Route composition

- `_app/route.tsx` -- `SidebarShell` + `AppHeader` (page title in
  header, breadcrumbs at top of page content) + `<Outlet />`
- `_auth/route.tsx` -- `DefaultShell` with centered card layout
- `_public/route.tsx` -- `DefaultShell` for public pages
