import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { auditFields } from '@/db/shared';
import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { users } from '@/modules/auth/db/schema';
import { categories } from '@/modules/categories/db/schema';
import { payees } from '@/modules/payees/db/schema';
import { transfers } from '@/modules/transfers/db/schema';

export const transactionDirectionEnum = pgEnum('transaction_direction', [
  'debit',
  'credit',
]);

export const tags = pgTable(
  'tags',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    name: text().notNull(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...auditFields,
  },
  (table) => [
    index('tags_user_id_idx').on(table.userId),
    uniqueIndex('tags_user_name_idx')
      .on(table.userId, table.name)
      .where(sql`${table.deletedAt} is null`),
    index('tags_user_active_idx')
      .on(table.userId)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const transactions = pgTable(
  'transactions',
  {
    accountId: uuid()
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: 'cascade' }),
    amountCents: integer().notNull(),
    balanceCents: integer(),
    categoryId: uuid().references(() => categories.id, {
      onDelete: 'set null',
    }),
    currency: text(),
    description: text().notNull(),
    direction: transactionDirectionEnum(),
    externalId: text(),
    fingerprint: text(),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    isSplit: boolean().notNull().default(false),
    memo: text(),
    payeeId: uuid().references(() => payees.id, { onDelete: 'set null' }),
    payeeNameRaw: text(),
    pending: boolean().notNull().default(false),
    postedAt: timestamp({ withTimezone: true }).notNull(),
    transactionAt: timestamp({ withTimezone: true }).notNull(),
    transferId: uuid().references(() => transfers.id, { onDelete: 'set null' }),
    ...auditFields,
  },
  (table) => [
    index('transactions_account_id_idx').on(table.accountId),
    index('transactions_account_posted_at_idx').on(
      table.accountId,
      table.postedAt,
    ),
    index('transactions_account_transaction_at_idx').on(
      table.accountId,
      table.transactionAt,
    ),
    index('transactions_account_active_posted_at_idx')
      .on(table.accountId, table.postedAt)
      .where(sql`${table.deletedAt} is null`),
    index('transactions_description_search_idx').using(
      'gin',
      sql`to_tsvector('english', ${table.description})`,
    ),
    index('transactions_category_id_idx').on(table.categoryId),
    index('transactions_payee_id_idx').on(table.payeeId),
    index('transactions_transfer_id_idx').on(table.transferId),
    uniqueIndex('transactions_account_external_id_idx').on(
      table.accountId,
      table.externalId,
    ),
    uniqueIndex('transactions_account_fingerprint_idx').on(
      table.accountId,
      table.fingerprint,
    ),
  ],
);

export const splitLines = pgTable(
  'split_lines',
  {
    amountCents: integer().notNull(),
    categoryId: uuid().references(() => categories.id, {
      onDelete: 'set null',
    }),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    memo: text(),
    sortOrder: integer().notNull(),
    transactionId: uuid()
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    ...auditFields,
  },
  (table) => [
    index('split_lines_transaction_id_idx').on(table.transactionId),
    index('split_lines_category_id_idx').on(table.categoryId),
  ],
);

export const transactionTags = pgTable(
  'transaction_tags',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    tagId: uuid()
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    transactionId: uuid()
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    ...auditFields,
  },
  (table) => [
    index('transaction_tags_transaction_id_idx').on(table.transactionId),
    index('transaction_tags_tag_id_idx').on(table.tagId),
    uniqueIndex('transaction_tags_unique_idx').on(
      table.transactionId,
      table.tagId,
    ),
  ],
);
