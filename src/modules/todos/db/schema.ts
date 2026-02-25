import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-arktype';
import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from '@/modules/auth/db/schema';

export const todos = pgTable('todos', {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  createdById: uuid().references(() => users.id, {
    onDelete: 'set null',
  }),
  deletedAt: timestamp({ withTimezone: true }),
  deletedById: uuid().references(() => users.id, {
    onDelete: 'set null',
  }),
  id: uuid()
    .primaryKey()
    .default(sql`uuidv7()`),
  title: text().notNull(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  updatedById: uuid().references(() => users.id, {
    onDelete: 'set null',
  }),
});

export const todosSelectSchema = createSelectSchema(todos);
export const todosInsertSchema = createInsertSchema(todos);
export const todosUpdateSchema = createUpdateSchema(todos);
export const todosDeleteSchema = todosSelectSchema.pick('id');
