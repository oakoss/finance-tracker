import { relations } from 'drizzle-orm';

import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { users } from '@/modules/auth/db/schema';
import { categories } from '@/modules/categories/db/schema';
import { payees } from '@/modules/payees/db/schema';
import {
  merchantRules,
  payeeAliases,
  recurringRules,
} from '@/modules/rules/db/schema';

export const payeeAliasesRelations = relations(payeeAliases, ({ one }) => ({
  payee: one(payees, {
    fields: [payeeAliases.payeeId],
    references: [payees.id],
  }),
}));

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
  user: one(users, { fields: [recurringRules.userId], references: [users.id] }),
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
  user: one(users, { fields: [merchantRules.userId], references: [users.id] }),
}));
