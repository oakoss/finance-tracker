import { relations } from 'drizzle-orm';

import { users } from '@/modules/auth/db/schema';
import { payees } from '@/modules/payees/db/schema';
import { payeeAliases, recurringRules } from '@/modules/rules/db/schema';
import { transactions } from '@/modules/transactions/db/schema';

export const payeesRelations = relations(payees, ({ many, one }) => ({
  aliases: many(payeeAliases),
  recurringRules: many(recurringRules),
  transactions: many(transactions),
  user: one(users, { fields: [payees.userId], references: [users.id] }),
}));
