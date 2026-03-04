import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-arktype';

import {
  promoBuckets,
  promoBucketTransactions,
  promotions,
} from '@/modules/promotions/db/schema';

export const promotionsSelectSchema = createSelectSchema(promotions);
export const promotionsInsertSchema = createInsertSchema(promotions);
export const promotionsUpdateSchema = createUpdateSchema(promotions);
export const promotionsDeleteSchema = promotionsSelectSchema.pick('id');

export type Promotion = typeof promotionsSelectSchema.infer;
export type PromotionInsert = typeof promotionsInsertSchema.infer;

export const promoBucketsSelectSchema = createSelectSchema(promoBuckets);
export const promoBucketsInsertSchema = createInsertSchema(promoBuckets);
export const promoBucketsUpdateSchema = createUpdateSchema(promoBuckets);
export const promoBucketsDeleteSchema = promoBucketsSelectSchema.pick('id');

export type PromoBucket = typeof promoBucketsSelectSchema.infer;
export type PromoBucketInsert = typeof promoBucketsInsertSchema.infer;

export const promoBucketTransactionsSelectSchema = createSelectSchema(
  promoBucketTransactions,
);
export const promoBucketTransactionsInsertSchema = createInsertSchema(
  promoBucketTransactions,
);
export const promoBucketTransactionsUpdateSchema = createUpdateSchema(
  promoBucketTransactions,
);
export const promoBucketTransactionsDeleteSchema =
  promoBucketTransactionsSelectSchema.pick('id');

export type PromoBucketTransaction =
  typeof promoBucketTransactionsSelectSchema.infer;
export type PromoBucketTransactionInsert =
  typeof promoBucketTransactionsInsertSchema.infer;
