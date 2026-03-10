import { relations } from 'drizzle-orm';

import { users } from '@/modules/auth/db/schema';
import { budgetLines, budgetPeriods } from '@/modules/budgets/db/schema';
import { categories } from '@/modules/categories/db/schema';

export const budgetPeriodsRelations = relations(
  budgetPeriods,
  ({ many, one }) => ({
    lines: many(budgetLines),
    user: one(users, {
      fields: [budgetPeriods.userId],
      references: [users.id],
    }),
  }),
);

export const budgetLinesRelations = relations(budgetLines, ({ one }) => ({
  category: one(categories, {
    fields: [budgetLines.categoryId],
    references: [categories.id],
  }),
  period: one(budgetPeriods, {
    fields: [budgetLines.budgetPeriodId],
    references: [budgetPeriods.id],
  }),
}));
