import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { auditFields } from '@/db/shared';
import { users } from '@/modules/auth/db/schema';
import { debtStrategies } from '@/modules/debt/db/schema';

export const userPreferences = pgTable('user_preferences', {
  activeDebtStrategyId: uuid().references(() => debtStrategies.id, {
    onDelete: 'set null',
  }),
  dateFormat: text(),
  defaultCurrency: text().notNull().default('USD'),
  locale: text().notNull().default('en-US'),
  numberFormat: text(),
  onboardingCompletedAt: timestamp({ withTimezone: true }),
  timeZone: text().notNull().default('UTC'),
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  ...auditFields,
});
