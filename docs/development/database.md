# Database

PostgreSQL + Drizzle ORM.

## Commands

```bash
pnpm docker:up
pnpm db:generate
pnpm db:migrate
```

Migrations live under `drizzle/`. Commit them only after schema generation is
intentional and ready.

## Notes

Conventions for money, timestamps, and audit columns are defined in
`docs/adr/0010-database-conventions.md`.

- Use implicit column names (e.g., `uuid()`, `text()`, `timestamp()`); Drizzle `casing: 'snake_case'` handles naming.
- Chain order: `primaryKey` → `notNull` → `unique` → `default` → `references` → `.$onUpdate`.
- Use `timestamp({ withTimezone: true })` for time columns.
- Place timestamp columns at the end of table definitions.

## Indexing Guidance

- Add composite indexes for hot query paths (ex: `transactions.account_id + posted_at`).
- Use partial indexes for soft-delete filtering (ex: `deleted_at IS NULL`).
- For search on large text fields, prefer Postgres GIN indexes with `to_tsvector`.

## Cascade Policy

- Use `onDelete: 'cascade'` for true child records (e.g., sessions).
- For audit fields (`createdById`, `updatedById`, `deletedById`), prefer `onDelete: 'set null'` to preserve history.
- For core domain data, prefer soft deletes over cascades.

## Unique Index Constants and Constraint Messages

Every `uniqueIndex(...)` call uses a typed constant, and every
user-facing duplicate-violation message is co-located with the schema
that produces it. This keeps schema, race-condition checks, and UI
copy drift-free: rename the index in one place and TypeScript flags
every consumer.

### In each `db/schema.ts`

```ts
// Index names used by uniqueIndex() and referenced in error handling.
export const payeesIndexNames = {
  userNameIdx: 'payees_user_name_idx',
} as const;

// User-facing copy for unique violations on this module's tables.
// Computed keys ensure the message key is always a real index name.
export const payeesConstraintMessages = {
  [payeesIndexNames.userNameIdx]: 'A payee with this name already exists.',
} as const;

export const payees = pgTable(
  'payees',
  {
    /* ... */
  },
  (table) => [
    uniqueIndex(payeesIndexNames.userNameIdx)
      .on(table.userId, table.name)
      .where(sql`${table.deletedAt} is null`),
  ],
);
```

### In `src/lib/db/pg-error.ts`

The shared helper composes every module's messages via spread:

```ts
const CONSTRAINT_MESSAGES: Record<string, string> = {
  ...accountsConstraintMessages,
  ...budgetsConstraintMessages,
  ...categoriesConstraintMessages,
  ...payeesConstraintMessages,
  ...transactionsConstraintMessages,
};
```

When adding a module with user-facing unique violations, add the
import and spread here.

### Race-condition checks

Catch blocks that re-read on `23505` must narrow both the error code
AND the specific constraint name. Anything else re-throws:

```ts
import { PG_ERROR_CODES, parsePgError } from '@/lib/db/pg-error';
import { payeesIndexNames } from '@/modules/payees/db/schema';

// ...
const pgInfo = parsePgError(error);
if (
  pgInfo?.code === PG_ERROR_CODES.UNIQUE_VIOLATION &&
  pgInfo.constraint === payeesIndexNames.userNameIdx
) {
  const raced = await database.query.payees.findFirst({
    /* ... */
  });
  if (raced) {
    log.warn({
      action: 'payee.create.raceResolved',
      outcome: { idHash: hashId(raced.id) },
      user: { idHash: hashId(userId) },
    });
    return raced;
  }
}
throw error;
```

The tight check means an unexpected unique violation (e.g., a future
second unique index) surfaces as a real error instead of silently
returning a stale row.

Services guarding against a single known race on a table with only
one unique constraint (e.g., `preferences/services/bootstrap.ts` on
the `userPreferences` primary key, or `imports/services/commit-import.ts`
where any dedup-constraint violation is a duplicate) may narrow by
code alone. Tables with multiple unique indexes should always include
the constraint-name check.

## Upsert / Dedup Pattern

Use `onConflictDoUpdate` with a no-op `set` when you need
"find-or-create" semantics. This avoids TOCTOU races (SELECT then
INSERT) and returns the row via `RETURNING` whether it was inserted
or already existed.

```ts
const [row] = await tx
  .insert(payees)
  .values({ createdById: userId, name, normalizedName, userId })
  .onConflictDoUpdate({
    set: { normalizedName: sql`excluded.normalized_name` },
    target: [payees.userId, payees.name],
    targetWhere: sql`${payees.deletedAt} is null`,
  })
  .returning({ id: payees.id });
```

- `target` + `targetWhere` must match a unique/partial-unique index.
- The `set` must touch at least one column (Postgres requires it);
  use a no-op like `col = excluded.col`.
- This works for batch inserts too — pass an array to `.values()`.
- See `resolve-payee.ts` and `resolve-tags.ts` for real examples.

## Safety Guidelines

- Always include `.where()` for `db.update()` and `db.delete()` statements.
- Prefer soft deletes over hard deletes.

## Example

```ts
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-arktype';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from '@/modules/auth/db/schema';

export const example = pgTable('example', {
  id: uuid().primaryKey(),
  name: text().notNull(),
  createdById: text().references(() => users.id, { onDelete: 'set null' }),
  updatedById: text().references(() => users.id, { onDelete: 'set null' }),
  deletedById: text().references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp({ withTimezone: true }),
});

export const exampleSelectSchema = createSelectSchema(example);
export const exampleInsertSchema = createInsertSchema(example);
export const exampleUpdateSchema = createUpdateSchema(example);
export const exampleDeleteSchema = exampleSelectSchema.pick('id');
```

## Schema Derivation Patterns

```ts
export const exampleSelectSchema = createSelectSchema(example);
export const exampleInsertSchema = createInsertSchema(example);
export const exampleUpdateSchema = createUpdateSchema(example);

export const exampleIdSchema = exampleSelectSchema.pick('id');
export const examplePublicSchema = exampleSelectSchema.omit('deletedAt');

export const exampleUpdatePayloadSchema = createUpdateSchema(example);
```

- Use `pick(...)` for narrow payloads (delete, lookup).
- Use `omit(...)` to hide internal columns (audit/timestamps).
- For “all optional” update payloads, prefer `createUpdateSchema(...)`.

For deeper ArkType usage and advanced schema composition, see
`docs/development/arktype.md`.

- Schema aggregator: `src/db/schema.ts` (re-exports all module schemas and relations).

## Relations

Each module defines its Drizzle relations in `src/modules/{module}/db/relations.ts`:

- `src/modules/auth/db/relations.ts` — `usersRelations`, `sessionsRelations`, `accountsRelations`, `verificationsRelations`
- `src/modules/{debt,imports,preferences,promotions,rules,statements,transfers}/db/relations.ts` — domain-specific relations
- `src/db/audit-relations.ts` — `auditLogsRelations`
- `src/modules/todos/db/relations.ts` — `todosRelations`

Drizzle requires exactly one `relations()` call per table. Since `users` has
relationships to tables across many modules, `usersRelations` is consolidated
in `auth/db/relations.ts`.

When adding a new table with a `userId` FK, add the corresponding `many()` entry
to `usersRelations` in `src/modules/auth/db/relations.ts`.
