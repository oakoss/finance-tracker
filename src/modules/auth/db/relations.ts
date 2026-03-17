import { relations } from 'drizzle-orm';

import { ledgerAccounts } from '@/modules/accounts/db/schema';
import {
  accounts,
  sessions,
  users,
  verifications,
} from '@/modules/auth/db/schema';
import { categories } from '@/modules/categories/db/schema';
import { debtStrategies } from '@/modules/debt/db/schema';
import { imports } from '@/modules/imports/db/schema';
import { userPreferences } from '@/modules/preferences/db/schema';
import { merchantRules, recurringRules } from '@/modules/rules/db/schema';
import { attachments, statements } from '@/modules/statements/db/schema';
import { payees, tags } from '@/modules/transactions/db/schema';
import { transfers } from '@/modules/transfers/db/schema';

// usersRelations spans auth and finance modules.
// Drizzle requires exactly one relations() call per table,
// so all user relations are consolidated here.
export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  attachments: many(attachments),
  categories: many(categories),
  debtStrategies: many(debtStrategies),
  imports: many(imports),
  ledgerAccounts: many(ledgerAccounts),
  merchantRules: many(merchantRules),
  payees: many(payees),
  preferences: one(userPreferences),
  recurringRules: many(recurringRules),
  sessions: many(sessions),
  statements: many(statements),
  tags: many(tags),
  transfers: many(transfers),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  users: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  users: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const verificationsRelations = relations(verifications, () => ({}));
