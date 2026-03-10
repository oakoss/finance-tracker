import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-arktype';

import { budgetLines, budgetPeriods } from '@/modules/budgets/db/schema';

export const budgetPeriodsSelectSchema = createSelectSchema(budgetPeriods);
export const budgetPeriodsInsertSchema = createInsertSchema(budgetPeriods);
export const budgetPeriodsUpdateSchema = createUpdateSchema(budgetPeriods);
export const budgetPeriodsDeleteSchema = budgetPeriodsSelectSchema.pick('id');

export type BudgetPeriod = typeof budgetPeriodsSelectSchema.infer;
export type BudgetPeriodInsert = typeof budgetPeriodsInsertSchema.infer;

export const budgetLinesSelectSchema = createSelectSchema(budgetLines);
export const budgetLinesInsertSchema = createInsertSchema(budgetLines);
export const budgetLinesUpdateSchema = createUpdateSchema(budgetLines);
export const budgetLinesDeleteSchema = budgetLinesSelectSchema.pick('id');

export type BudgetLine = typeof budgetLinesSelectSchema.infer;
export type BudgetLineInsert = typeof budgetLinesInsertSchema.infer;
