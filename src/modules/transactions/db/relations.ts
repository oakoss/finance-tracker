import { relations } from 'drizzle-orm';

import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { users } from '@/modules/auth/db/schema';
import { categories } from '@/modules/categories/db/schema';
import { importRows } from '@/modules/imports/db/schema';
import { promoBucketTransactions } from '@/modules/promotions/db/schema';
import {
  merchantRules,
  payeeAliases,
  recurringRules,
} from '@/modules/rules/db/schema';
import { attachments } from '@/modules/statements/db/schema';
import {
  payees,
  tags,
  transactions,
  transactionTags,
} from '@/modules/transactions/db/schema';
import { transfers } from '@/modules/transfers/db/schema';

export const transactionsRelations = relations(
  transactions,
  ({ many, one }) => ({
    account: one(ledgerAccounts, {
      fields: [transactions.accountId],
      references: [ledgerAccounts.id],
    }),
    attachments: many(attachments),
    category: one(categories, {
      fields: [transactions.categoryId],
      references: [categories.id],
    }),
    importRows: many(importRows),
    payee: one(payees, {
      fields: [transactions.payeeId],
      references: [payees.id],
    }),
    promoBucketTransactions: many(promoBucketTransactions),
    transactionTags: many(transactionTags),
    transfer: one(transfers, {
      fields: [transactions.transferId],
      references: [transfers.id],
    }),
  }),
);

export const transactionTagsRelations = relations(
  transactionTags,
  ({ one }) => ({
    tag: one(tags, {
      fields: [transactionTags.tagId],
      references: [tags.id],
    }),
    transaction: one(transactions, {
      fields: [transactionTags.transactionId],
      references: [transactions.id],
    }),
  }),
);

export const payeesRelations = relations(payees, ({ many, one }) => ({
  aliases: many(payeeAliases),
  merchantRules: many(merchantRules),
  recurringRules: many(recurringRules),
  transactions: many(transactions),
  user: one(users, {
    fields: [payees.userId],
    references: [users.id],
  }),
}));

export const tagsRelations = relations(tags, ({ many, one }) => ({
  transactionTags: many(transactionTags),
  user: one(users, {
    fields: [tags.userId],
    references: [users.id],
  }),
}));
