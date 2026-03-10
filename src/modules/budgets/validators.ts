import { type } from 'arktype';

import {
  budgetLinesDeleteSchema,
  budgetPeriodsDeleteSchema,
} from '@/modules/budgets/models';

export const createBudgetPeriodSchema = type({
  month: '1 <= number.integer <= 12',
  'notes?': '0 < string <= 500',
  year: '2000 <= number.integer <= 2100',
});

export type CreateBudgetPeriodInput = typeof createBudgetPeriodSchema.infer;

export const updateBudgetPeriodSchema = type({
  id: 'string > 0',
  'month?': '1 <= number.integer <= 12',
  'notes?': '(0 < string <= 500) | null',
  'year?': '2000 <= number.integer <= 2100',
});

export type UpdateBudgetPeriodInput = typeof updateBudgetPeriodSchema.infer;

export const deleteBudgetPeriodSchema = budgetPeriodsDeleteSchema;

export type DeleteBudgetPeriodInput = typeof deleteBudgetPeriodSchema.infer;

export const createBudgetLineSchema = type({
  amountCents: 'number.integer >= 0',
  budgetPeriodId: 'string > 0',
  categoryId: 'string > 0',
  'notes?': '0 < string <= 500',
});

export type CreateBudgetLineInput = typeof createBudgetLineSchema.infer;

export const updateBudgetLineSchema = type({
  'amountCents?': 'number.integer >= 0',
  'categoryId?': 'string > 0',
  id: 'string > 0',
  'notes?': '(0 < string <= 500) | null',
});

export type UpdateBudgetLineInput = typeof updateBudgetLineSchema.infer;

export const deleteBudgetLineSchema = budgetLinesDeleteSchema;

export type DeleteBudgetLineInput = typeof deleteBudgetLineSchema.infer;
