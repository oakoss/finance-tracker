import { sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { auditFields } from '@/db/shared';
import { users } from '@/modules/auth/db/schema';
import { categories } from '@/modules/categories/db/schema';

export const budgetPeriods = pgTable(
  'budget_periods',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    month: integer().notNull(),
    notes: text(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    year: integer().notNull(),
    ...auditFields,
  },
  (table) => [
    index('budget_periods_user_id_idx').on(table.userId),
    uniqueIndex('budget_periods_user_year_month_idx')
      .on(table.userId, table.year, table.month)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const budgetLines = pgTable(
  'budget_lines',
  {
    amountCents: integer().notNull(),
    budgetPeriodId: uuid().notNull(),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    notes: text(),
    ...auditFields,
  },
  (table) => [
    index('budget_lines_period_id_idx').on(table.budgetPeriodId),
    uniqueIndex('budget_lines_period_category_idx')
      .on(table.budgetPeriodId, table.categoryId)
      .where(sql`${table.deletedAt} is null`),
    foreignKey({
      columns: [table.budgetPeriodId],
      foreignColumns: [budgetPeriods.id],
    }).onDelete('cascade'),
  ],
);
