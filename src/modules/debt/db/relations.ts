import { relations } from 'drizzle-orm';

import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { users } from '@/modules/auth/db/schema';
import {
  debtStrategies,
  debtStrategyOrder,
  debtStrategyRuns,
} from '@/modules/debt/db/schema';

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
