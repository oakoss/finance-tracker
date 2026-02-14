import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-arktype';
import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from '@/modules/auth/schema';

export const todos = pgTable('todos', {
  id: uuid()
    .primaryKey()
    .default(sql`uuidv7()`),
  title: text().notNull(),
  createdById: uuid().references(() => users.id, {
    onDelete: 'set null',
  }),
  updatedById: uuid().references(() => users.id, {
    onDelete: 'set null',
  }),
  deletedById: uuid().references(() => users.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp({ withTimezone: true }),
});

export const todosSelectSchema = createSelectSchema(todos);
export const todosInsertSchema = createInsertSchema(todos);
export const todosUpdateSchema = createUpdateSchema(todos);
export const todosDeleteSchema = todosSelectSchema.pick('id');
