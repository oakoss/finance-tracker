import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { auditFields } from '@/db/shared';
import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { users } from '@/modules/auth/db/schema';
import { transactions } from '@/modules/transactions/db/schema';

export const statementSourceEnum = pgEnum('statement_source', ['pdf', 'csv']);

export const statements = pgTable(
  'statements',
  {
    accountId: uuid()
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: 'cascade' }),
    fileHash: text(),
    fileName: text(),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    periodEnd: timestamp({ withTimezone: true }).notNull(),
    periodStart: timestamp({ withTimezone: true }).notNull(),
    source: statementSourceEnum().notNull(),
    statementDate: timestamp({ withTimezone: true }),
    uploadedAt: timestamp({ withTimezone: true }).defaultNow(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...auditFields,
  },
  (table) => [
    index('statements_user_id_idx').on(table.userId),
    index('statements_account_id_idx').on(table.accountId),
  ],
);

export const attachments = pgTable(
  'attachments',
  {
    fileName: text().notNull(),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    mimeType: text().notNull(),
    sizeBytes: integer().notNull(),
    statementId: uuid().references(() => statements.id, {
      onDelete: 'set null',
    }),
    storageKey: text().notNull(),
    transactionId: uuid().references(() => transactions.id, {
      onDelete: 'set null',
    }),
    uploadedAt: timestamp({ withTimezone: true }).defaultNow(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...auditFields,
  },
  (table) => [
    index('attachments_user_id_idx').on(table.userId),
    index('attachments_transaction_id_idx').on(table.transactionId),
    index('attachments_statement_id_idx').on(table.statementId),
  ],
);
