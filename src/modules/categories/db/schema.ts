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

export const categoriesIndexNames = {
  userNameIdx: 'categories_user_name_idx',
} as const;

// Derived from the constant's values rather than restated, so adding an
// entry to categoriesIndexNames fails the `satisfies` below until it has
// copy. Plain indexes are declared inline as bare strings and never enter
// the constant, so they cannot reach this union.
type CategoriesConstraintName =
  (typeof categoriesIndexNames)[keyof typeof categoriesIndexNames];

export const categoriesConstraintMessages = {
  [categoriesIndexNames.userNameIdx]:
    'A category with this name already exists.',
} as const satisfies Record<CategoriesConstraintName, string>;

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
    uniqueIndex(categoriesIndexNames.userNameIdx)
      .on(table.userId, table.name)
      .where(sql`${table.deletedAt} is null`),
    index('categories_user_active_idx')
      .on(table.userId)
      .where(sql`${table.deletedAt} is null`),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
    }).onDelete('set null'),
  ],
);
