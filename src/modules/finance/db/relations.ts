import { relations } from 'drizzle-orm';

import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { users } from '@/modules/auth/db/schema';
import { categories } from '@/modules/categories/db/schema';
import {
  attachments,
  auditLogs,
  debtStrategies,
  debtStrategyOrder,
  debtStrategyRuns,
  importRows,
  imports,
  merchantRules,
  payeeAliases,
  promoBuckets,
  promoBucketTransactions,
  promotions,
  recurringRules,
  statements,
  transfers,
  userPreferences,
} from '@/modules/finance/db/schema';
import { payees, transactions } from '@/modules/transactions/db/schema';

export const payeeAliasesRelations = relations(payeeAliases, ({ one }) => ({
  payee: one(payees, {
    fields: [payeeAliases.payeeId],
    references: [payees.id],
  }),
}));

export const transfersRelations = relations(transfers, ({ many, one }) => ({
  fromAccount: one(ledgerAccounts, {
    fields: [transfers.fromAccountId],
    references: [ledgerAccounts.id],
    relationName: 'transferFrom',
  }),
  toAccount: one(ledgerAccounts, {
    fields: [transfers.toAccountId],
    references: [ledgerAccounts.id],
    relationName: 'transferTo',
  }),
  transactions: many(transactions),
  user: one(users, {
    fields: [transfers.userId],
    references: [users.id],
  }),
}));

export const importsRelations = relations(imports, ({ many, one }) => ({
  account: one(ledgerAccounts, {
    fields: [imports.accountId],
    references: [ledgerAccounts.id],
  }),
  rows: many(importRows),
  user: one(users, {
    fields: [imports.userId],
    references: [users.id],
  }),
}));

export const importRowsRelations = relations(importRows, ({ one }) => ({
  import: one(imports, {
    fields: [importRows.importId],
    references: [imports.id],
  }),
  transaction: one(transactions, {
    fields: [importRows.transactionId],
    references: [transactions.id],
  }),
}));

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

export const debtStrategiesRelations = relations(
  debtStrategies,
  ({ many, one }) => ({
    orders: many(debtStrategyOrder),
    runs: many(debtStrategyRuns),
    user: one(users, {
      fields: [debtStrategies.userId],
      references: [users.id],
    }),
  }),
);

export const debtStrategyOrderRelations = relations(
  debtStrategyOrder,
  ({ one }) => ({
    account: one(ledgerAccounts, {
      fields: [debtStrategyOrder.accountId],
      references: [ledgerAccounts.id],
    }),
    strategy: one(debtStrategies, {
      fields: [debtStrategyOrder.strategyId],
      references: [debtStrategies.id],
    }),
  }),
);

export const debtStrategyRunsRelations = relations(
  debtStrategyRuns,
  ({ one }) => ({
    strategy: one(debtStrategies, {
      fields: [debtStrategyRuns.strategyId],
      references: [debtStrategies.id],
    }),
  }),
);

export const userPreferencesRelations = relations(
  userPreferences,
  ({ one }) => ({
    activeDebtStrategy: one(debtStrategies, {
      fields: [userPreferences.activeDebtStrategyId],
      references: [debtStrategies.id],
    }),
    user: one(users, {
      fields: [userPreferences.userId],
      references: [users.id],
    }),
  }),
);

export const recurringRulesRelations = relations(recurringRules, ({ one }) => ({
  account: one(ledgerAccounts, {
    fields: [recurringRules.accountId],
    references: [ledgerAccounts.id],
  }),
  category: one(categories, {
    fields: [recurringRules.categoryId],
    references: [categories.id],
  }),
  payee: one(payees, {
    fields: [recurringRules.payeeId],
    references: [payees.id],
  }),
  user: one(users, {
    fields: [recurringRules.userId],
    references: [users.id],
  }),
}));

export const merchantRulesRelations = relations(merchantRules, ({ one }) => ({
  category: one(categories, {
    fields: [merchantRules.categoryId],
    references: [categories.id],
  }),
  payee: one(payees, {
    fields: [merchantRules.payeeId],
    references: [payees.id],
  }),
  user: one(users, {
    fields: [merchantRules.userId],
    references: [users.id],
  }),
}));

export const statementsRelations = relations(statements, ({ many, one }) => ({
  account: one(ledgerAccounts, {
    fields: [statements.accountId],
    references: [ledgerAccounts.id],
  }),
  attachments: many(attachments),
  user: one(users, {
    fields: [statements.userId],
    references: [users.id],
  }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  statement: one(statements, {
    fields: [attachments.statementId],
    references: [statements.id],
  }),
  transaction: one(transactions, {
    fields: [attachments.transactionId],
    references: [transactions.id],
  }),
  user: one(users, {
    fields: [attachments.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
  }),
}));
