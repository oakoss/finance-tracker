import { relations } from 'drizzle-orm';

import { users } from '@/modules/auth/db/schema';
import { debtStrategies } from '@/modules/debt/db/schema';
import { userPreferences } from '@/modules/preferences/db/schema';

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
