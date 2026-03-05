import { type } from 'arktype';

import { dateString } from '@/lib/form/schema';
import { transactionDirectionEnum } from '@/modules/transactions/db/schema';
import { transactionsDeleteSchema } from '@/modules/transactions/models';

export const createTransactionSchema = type({
  accountId: 'string > 0',
  amountCents: 'number.integer > 0',
  'categoryId?': '(string > 0) | null',
  description: '0 < string <= 500',
  'direction?': type.enumerated(...transactionDirectionEnum.enumValues),
  'memo?': '(string <= 1000) | null',
  'newPayeeName?': '0 < string <= 200',
  'newTagNames?': 'string[]',
  'payeeId?': '(string > 0) | null',
  'pending?': 'boolean',
  'tagIds?': 'string[]',
  transactionAt: dateString,
});

export type CreateTransactionInput = typeof createTransactionSchema.infer;

export const updateTransactionSchema = type({
  'accountId?': 'string > 0',
  'amountCents?': 'number.integer > 0',
  'categoryId?': '(string > 0) | null',
  'description?': '0 < string <= 500',
  'direction?': type.enumerated(...transactionDirectionEnum.enumValues),
  id: 'string > 0',
  'memo?': '(string <= 1000) | null',
  'newPayeeName?': '0 < string <= 200',
  'newTagNames?': 'string[]',
  'payeeId?': '(string > 0) | null',
  'pending?': 'boolean',
  'tagIds?': 'string[]',
  'transactionAt?': dateString,
});

export type UpdateTransactionInput = typeof updateTransactionSchema.infer;

export const deleteTransactionSchema = transactionsDeleteSchema;

export type DeleteTransactionInput = typeof deleteTransactionSchema.infer;

export const createPayeeSchema = type({
  name: '0 < string <= 200',
});

export type CreatePayeeInput = typeof createPayeeSchema.infer;

export const createTagSchema = type({
  name: '0 < string <= 100',
});

export type CreateTagInput = typeof createTagSchema.infer;
