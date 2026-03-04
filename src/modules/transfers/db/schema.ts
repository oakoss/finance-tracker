import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { auditFields } from '@/db/shared';
import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { users } from '@/modules/auth/db/schema';

export const transfers = pgTable(
  'transfers',
  {
    amountCents: integer().notNull(),
    fromAccountId: uuid()
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: 'cascade' }),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    memo: text(),
    toAccountId: uuid()
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: 'cascade' }),
    transferAt: timestamp({ withTimezone: true }).notNull(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...auditFields,
  },
  (table) => [
    index('transfers_user_id_idx').on(table.userId),
    index('transfers_from_account_id_idx').on(table.fromAccountId),
    index('transfers_to_account_id_idx').on(table.toAccountId),
  ],
);
