import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-arktype';

import {
  debtStrategies,
  debtStrategyOrder,
  debtStrategyRuns,
} from '@/modules/debt/db/schema';

export const debtStrategiesSelectSchema = createSelectSchema(debtStrategies);
export const debtStrategiesInsertSchema = createInsertSchema(debtStrategies);
export const debtStrategiesUpdateSchema = createUpdateSchema(debtStrategies);
export const debtStrategiesDeleteSchema = debtStrategiesSelectSchema.pick('id');

export type DebtStrategy = typeof debtStrategiesSelectSchema.infer;
export type DebtStrategyInsert = typeof debtStrategiesInsertSchema.infer;

export const debtStrategyOrderSelectSchema =
  createSelectSchema(debtStrategyOrder);
export const debtStrategyOrderInsertSchema =
  createInsertSchema(debtStrategyOrder);
export const debtStrategyOrderUpdateSchema =
  createUpdateSchema(debtStrategyOrder);
export const debtStrategyOrderDeleteSchema =
  debtStrategyOrderSelectSchema.pick('id');

export type DebtStrategyOrder = typeof debtStrategyOrderSelectSchema.infer;
export type DebtStrategyOrderInsert =
  typeof debtStrategyOrderInsertSchema.infer;

export const debtStrategyRunsSelectSchema =
  createSelectSchema(debtStrategyRuns);
export const debtStrategyRunsInsertSchema =
  createInsertSchema(debtStrategyRuns);
export const debtStrategyRunsUpdateSchema =
  createUpdateSchema(debtStrategyRuns);
export const debtStrategyRunsDeleteSchema =
  debtStrategyRunsSelectSchema.pick('id');

export type DebtStrategyRun = typeof debtStrategyRunsSelectSchema.infer;
export type DebtStrategyRunInsert = typeof debtStrategyRunsInsertSchema.infer;
