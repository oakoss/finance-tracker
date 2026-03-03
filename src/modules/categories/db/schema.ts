import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-arktype';
import { sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { auditFields } from '@/db/shared';
import { users } from '@/modules/auth/db/schema';

export const categoryTypeEnum = pgEnum('category_type', [
  'income',
  'expense',
  'transfer',
]);

export const categories = pgTable(
  'categories',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    name: text().notNull(),
    parentId: uuid(),
    type: categoryTypeEnum().notNull(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...auditFields,
  },
  (table) => [
    index('categories_user_id_idx').on(table.userId),
    uniqueIndex('categories_user_name_idx').on(table.userId, table.name),
    index('categories_user_active_idx')
      .on(table.userId)
      .where(sql`${table.deletedAt} is null`),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
    }).onDelete('set null'),
  ],
);

export const categoriesSelectSchema = createSelectSchema(categories);
export const categoriesInsertSchema = createInsertSchema(categories);
export const categoriesUpdateSchema = createUpdateSchema(categories);
export const categoriesDeleteSchema = categoriesSelectSchema.pick('id');
