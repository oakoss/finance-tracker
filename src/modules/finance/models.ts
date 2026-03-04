import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-arktype';

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

export const userPreferencesSelectSchema = createSelectSchema(userPreferences);
export const userPreferencesInsertSchema = createInsertSchema(userPreferences);
export const userPreferencesUpdateSchema = createUpdateSchema(userPreferences);
export const userPreferencesDeleteSchema =
  userPreferencesSelectSchema.pick('userId');

export const payeeAliasesSelectSchema = createSelectSchema(payeeAliases);
export const payeeAliasesInsertSchema = createInsertSchema(payeeAliases);
export const payeeAliasesUpdateSchema = createUpdateSchema(payeeAliases);
export const payeeAliasesDeleteSchema = payeeAliasesSelectSchema.pick('id');

export const transfersSelectSchema = createSelectSchema(transfers);
export const transfersInsertSchema = createInsertSchema(transfers);
export const transfersUpdateSchema = createUpdateSchema(transfers);
export const transfersDeleteSchema = transfersSelectSchema.pick('id');

export type Transfer = typeof transfersSelectSchema.infer;
export type TransferInsert = typeof transfersInsertSchema.infer;

export const importsSelectSchema = createSelectSchema(imports);
export const importsInsertSchema = createInsertSchema(imports);
export const importsUpdateSchema = createUpdateSchema(imports);
export const importsDeleteSchema = importsSelectSchema.pick('id');

export const importRowsSelectSchema = createSelectSchema(importRows);
export const importRowsInsertSchema = createInsertSchema(importRows);
export const importRowsUpdateSchema = createUpdateSchema(importRows);
export const importRowsDeleteSchema = importRowsSelectSchema.pick('id');

export const promotionsSelectSchema = createSelectSchema(promotions);
export const promotionsInsertSchema = createInsertSchema(promotions);
export const promotionsUpdateSchema = createUpdateSchema(promotions);
export const promotionsDeleteSchema = promotionsSelectSchema.pick('id');

export const promoBucketsSelectSchema = createSelectSchema(promoBuckets);
export const promoBucketsInsertSchema = createInsertSchema(promoBuckets);
export const promoBucketsUpdateSchema = createUpdateSchema(promoBuckets);
export const promoBucketsDeleteSchema = promoBucketsSelectSchema.pick('id');

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

export const debtStrategiesSelectSchema = createSelectSchema(debtStrategies);
export const debtStrategiesInsertSchema = createInsertSchema(debtStrategies);
export const debtStrategiesUpdateSchema = createUpdateSchema(debtStrategies);
export const debtStrategiesDeleteSchema = debtStrategiesSelectSchema.pick('id');

export const debtStrategyOrderSelectSchema =
  createSelectSchema(debtStrategyOrder);
export const debtStrategyOrderInsertSchema =
  createInsertSchema(debtStrategyOrder);
export const debtStrategyOrderUpdateSchema =
  createUpdateSchema(debtStrategyOrder);
export const debtStrategyOrderDeleteSchema =
  debtStrategyOrderSelectSchema.pick('id');

export const debtStrategyRunsSelectSchema =
  createSelectSchema(debtStrategyRuns);
export const debtStrategyRunsInsertSchema =
  createInsertSchema(debtStrategyRuns);
export const debtStrategyRunsUpdateSchema =
  createUpdateSchema(debtStrategyRuns);
export const debtStrategyRunsDeleteSchema =
  debtStrategyRunsSelectSchema.pick('id');

export const recurringRulesSelectSchema = createSelectSchema(recurringRules);
export const recurringRulesInsertSchema = createInsertSchema(recurringRules);
export const recurringRulesUpdateSchema = createUpdateSchema(recurringRules);
export const recurringRulesDeleteSchema = recurringRulesSelectSchema.pick('id');

export const merchantRulesSelectSchema = createSelectSchema(merchantRules);
export const merchantRulesInsertSchema = createInsertSchema(merchantRules);
export const merchantRulesUpdateSchema = createUpdateSchema(merchantRules);
export const merchantRulesDeleteSchema = merchantRulesSelectSchema.pick('id');

export const statementsSelectSchema = createSelectSchema(statements);
export const statementsInsertSchema = createInsertSchema(statements);
export const statementsUpdateSchema = createUpdateSchema(statements);
export const statementsDeleteSchema = statementsSelectSchema.pick('id');

export const attachmentsSelectSchema = createSelectSchema(attachments);
export const attachmentsInsertSchema = createInsertSchema(attachments);
export const attachmentsUpdateSchema = createUpdateSchema(attachments);
export const attachmentsDeleteSchema = attachmentsSelectSchema.pick('id');

export const auditLogsSelectSchema = createSelectSchema(auditLogs);
export const auditLogsInsertSchema = createInsertSchema(auditLogs);
export const auditLogsUpdateSchema = createUpdateSchema(auditLogs);
export const auditLogsDeleteSchema = auditLogsSelectSchema.pick('id');
