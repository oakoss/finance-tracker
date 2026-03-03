import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-arktype';
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
import { transfers } from '@/modules/finance/db/schema';

export const transactionDirectionEnum = pgEnum('transaction_direction', [
  'debit',
  'credit',
]);

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
    uniqueIndex('payees_user_name_idx').on(table.userId, table.name),
    index('payees_user_active_idx')
      .on(table.userId)
      .where(sql`${table.deletedAt} is null`),
  ],
);

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
    uniqueIndex('tags_user_name_idx').on(table.userId, table.name),
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

export const payeesSelectSchema = createSelectSchema(payees);
export const payeesInsertSchema = createInsertSchema(payees);
export const payeesUpdateSchema = createUpdateSchema(payees);
export const payeesDeleteSchema = payeesSelectSchema.pick('id');

export const tagsSelectSchema = createSelectSchema(tags);
export const tagsInsertSchema = createInsertSchema(tags);
export const tagsUpdateSchema = createUpdateSchema(tags);
export const tagsDeleteSchema = tagsSelectSchema.pick('id');

export const transactionsSelectSchema = createSelectSchema(transactions);
export const transactionsInsertSchema = createInsertSchema(transactions);
export const transactionsUpdateSchema = createUpdateSchema(transactions);
export const transactionsDeleteSchema = transactionsSelectSchema.pick('id');

export const transactionTagsSelectSchema = createSelectSchema(transactionTags);
export const transactionTagsInsertSchema = createInsertSchema(transactionTags);
export const transactionTagsUpdateSchema = createUpdateSchema(transactionTags);
export const transactionTagsDeleteSchema =
  transactionTagsSelectSchema.pick('id');
