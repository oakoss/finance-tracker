import { relations } from 'drizzle-orm';

import { users } from '@/modules/auth/db/schema';
import {
  accountBalanceSnapshots,
  accountTerms,
  attachments,
  auditLogs,
  categories,
  creditCardCatalog,
  debtStrategies,
  debtStrategyOrder,
  debtStrategyRuns,
  importRows,
  imports,
  ledgerAccounts,
  merchantRules,
  payeeAliases,
  payees,
  promoBuckets,
  promoBucketTransactions,
  promotions,
  recurringRules,
  statements,
  tags,
  transactions,
  transactionTags,
  transfers,
  userPreferences,
} from '@/modules/finance/db/schema';

export const creditCardCatalogRelations = relations(
  creditCardCatalog,
  ({ many }) => ({
    ledgerAccounts: many(ledgerAccounts),
  }),
);

export const ledgerAccountsRelations = relations(
  ledgerAccounts,
  ({ many, one }) => ({
    balanceSnapshots: many(accountBalanceSnapshots),
    creditCardCatalog: one(creditCardCatalog, {
      fields: [ledgerAccounts.creditCardCatalogId],
      references: [creditCardCatalog.id],
    }),
    debtStrategyOrders: many(debtStrategyOrder),
    imports: many(imports),
    promotions: many(promotions),
    statements: many(statements),
    terms: many(accountTerms),
    transactions: many(transactions),
    transfersFrom: many(transfers, { relationName: 'transferFrom' }),
    transfersTo: many(transfers, { relationName: 'transferTo' }),
    user: one(users, {
      fields: [ledgerAccounts.userId],
      references: [users.id],
    }),
  }),
);

export const accountTermsRelations = relations(accountTerms, ({ one }) => ({
  account: one(ledgerAccounts, {
    fields: [accountTerms.accountId],
    references: [ledgerAccounts.id],
  }),
}));

export const accountBalanceSnapshotsRelations = relations(
  accountBalanceSnapshots,
  ({ one }) => ({
    account: one(ledgerAccounts, {
      fields: [accountBalanceSnapshots.accountId],
      references: [ledgerAccounts.id],
    }),
  }),
);

export const categoriesRelations = relations(categories, ({ many, one }) => ({
  children: many(categories, { relationName: 'categoryParent' }),
  merchantRules: many(merchantRules),
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'categoryParent',
  }),
  recurringRules: many(recurringRules),
  transactions: many(transactions),
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
}));

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

export const payeeAliasesRelations = relations(payeeAliases, ({ one }) => ({
  payee: one(payees, {
    fields: [payeeAliases.payeeId],
    references: [payees.id],
  }),
}));

export const tagsRelations = relations(tags, ({ many, one }) => ({
  transactionTags: many(transactionTags),
  user: one(users, {
    fields: [tags.userId],
    references: [users.id],
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
