import { sql } from 'drizzle-orm';
import { index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { auditFields } from '@/db/shared';
import { users } from '@/modules/auth/db/schema';

export const payeesIndexNames = {
  userNameIdx: 'payees_user_name_idx',
} as const;

export const payeesConstraintMessages = {
  [payeesIndexNames.userNameIdx]: 'A payee with this name already exists.',
} as const;

export const payees = pgTable(
  'payees',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    name: text().notNull(),
    normalizedName: text(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...auditFields,
  },
  (table) => [
    index('payees_user_id_idx').on(table.userId),
    uniqueIndex(payeesIndexNames.userNameIdx)
      .on(table.userId, table.name)
      .where(sql`${table.deletedAt} is null`),
    index('payees_user_active_idx')
      .on(table.userId)
      .where(sql`${table.deletedAt} is null`),
  ],
);
