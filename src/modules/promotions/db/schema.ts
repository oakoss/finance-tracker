import { sql } from 'drizzle-orm';
import {
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
import { transactions } from '@/modules/transactions/db/schema';

export const promoTypeEnum = pgEnum('promo_type', [
  'purchase_0_apr',
  'balance_transfer_0_apr',
  'deferred_interest',
]);

export const promotions = pgTable(
  'promotions',
  {
    accountId: uuid()
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: 'cascade' }),
    description: text(),
    endDate: timestamp({ withTimezone: true }).notNull(),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    promoAprBps: integer().notNull(),
    promoLimitCents: integer(),
    promoType: promoTypeEnum().notNull(),
    startDate: timestamp({ withTimezone: true }).notNull(),
    ...auditFields,
  },
  (table) => [index('promotions_account_id_idx').on(table.accountId)],
);

export const promoBuckets = pgTable(
  'promo_buckets',
  {
    closedAt: timestamp({ withTimezone: true }),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    name: text().notNull(),
    openedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    principalCents: integer().notNull(),
    promotionId: uuid()
      .notNull()
      .references(() => promotions.id, { onDelete: 'cascade' }),
    ...auditFields,
  },
  (table) => [index('promo_buckets_promotion_id_idx').on(table.promotionId)],
);

export const promoBucketTransactions = pgTable(
  'promo_bucket_transactions',
  {
    amountCents: integer().notNull(),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    promoBucketId: uuid()
      .notNull()
      .references(() => promoBuckets.id, { onDelete: 'cascade' }),
    transactionId: uuid()
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    ...auditFields,
  },
  (table) => [
    index('promo_bucket_transactions_bucket_id_idx').on(table.promoBucketId),
    index('promo_bucket_transactions_transaction_id_idx').on(
      table.transactionId,
    ),
    uniqueIndex('promo_bucket_transactions_unique_idx').on(
      table.promoBucketId,
      table.transactionId,
    ),
  ],
);
