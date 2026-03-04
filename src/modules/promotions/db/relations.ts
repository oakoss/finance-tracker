import { relations } from 'drizzle-orm';

import { ledgerAccounts } from '@/modules/accounts/db/schema';
import {
  promoBuckets,
  promoBucketTransactions,
  promotions,
} from '@/modules/promotions/db/schema';
import { transactions } from '@/modules/transactions/db/schema';

export const promotionsRelations = relations(promotions, ({ many, one }) => ({
  account: one(ledgerAccounts, {
    fields: [promotions.accountId],
    references: [ledgerAccounts.id],
  }),
  buckets: many(promoBuckets),
}));

export const promoBucketsRelations = relations(
  promoBuckets,
  ({ many, one }) => ({
    bucketTransactions: many(promoBucketTransactions),
    promotion: one(promotions, {
      fields: [promoBuckets.promotionId],
      references: [promotions.id],
    }),
  }),
);

export const promoBucketTransactionsRelations = relations(
  promoBucketTransactions,
  ({ one }) => ({
    bucket: one(promoBuckets, {
      fields: [promoBucketTransactions.promoBucketId],
      references: [promoBuckets.id],
    }),
    transaction: one(transactions, {
      fields: [promoBucketTransactions.transactionId],
      references: [transactions.id],
    }),
  }),
);
