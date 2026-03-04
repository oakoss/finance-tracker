import { relations } from 'drizzle-orm';

import { users } from '@/modules/auth/db/schema';
import { categories } from '@/modules/categories/db/schema';
import { merchantRules, recurringRules } from '@/modules/rules/db/schema';
import { transactions } from '@/modules/transactions/db/schema';

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
