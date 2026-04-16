import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-arktype';

import {
  splitLines,
  tags,
  transactions,
  transactionTags,
} from '@/modules/transactions/db/schema';

export const tagsSelectSchema = createSelectSchema(tags);
export const tagsInsertSchema = createInsertSchema(tags);
export const tagsUpdateSchema = createUpdateSchema(tags);
export const tagsDeleteSchema = tagsSelectSchema.pick('id');

export type Tag = typeof tagsSelectSchema.infer;
export type TagInsert = typeof tagsInsertSchema.infer;

export const transactionsSelectSchema = createSelectSchema(transactions);
export const transactionsInsertSchema = createInsertSchema(transactions);
export const transactionsUpdateSchema = createUpdateSchema(transactions);
export const transactionsDeleteSchema = transactionsSelectSchema.pick('id');

export type Transaction = typeof transactionsSelectSchema.infer;
export type TransactionInsert = typeof transactionsInsertSchema.infer;

export const splitLinesSelectSchema = createSelectSchema(splitLines);
export const splitLinesInsertSchema = createInsertSchema(splitLines);
export const splitLinesUpdateSchema = createUpdateSchema(splitLines);
export const splitLinesDeleteSchema = splitLinesSelectSchema.pick('id');

export type SplitLine = typeof splitLinesSelectSchema.infer;
export type SplitLineInsert = typeof splitLinesInsertSchema.infer;

export const transactionTagsSelectSchema = createSelectSchema(transactionTags);
export const transactionTagsInsertSchema = createInsertSchema(transactionTags);
export const transactionTagsUpdateSchema = createUpdateSchema(transactionTags);
export const transactionTagsDeleteSchema =
  transactionTagsSelectSchema.pick('id');

export type TransactionTag = typeof transactionTagsSelectSchema.infer;
export type TransactionTagInsert = typeof transactionTagsInsertSchema.infer;
