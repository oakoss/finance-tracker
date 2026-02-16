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
import { users } from '@/modules/auth/schema';

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

- Schema aggregator: `src/db/schema.ts`.
