import { relations } from 'drizzle-orm';

import { ledgerAccounts } from '@/modules/accounts/db/schema';
import {
  accounts,
  sessions,
  users,
  verifications,
} from '@/modules/auth/db/schema';
import {
  attachments,
  categories,
  debtStrategies,
  imports,
  merchantRules,
  payees,
  recurringRules,
  statements,
  tags,
  transfers,
  userPreferences,
} from '@/modules/finance/db/schema';
import { todos } from '@/modules/todos/db/schema';

// usersRelations spans auth, finance, and todos modules.
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
  todos: many(todos),
  transfers: many(transfers),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  users: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  users: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const verificationsRelations = relations(verifications, () => ({}));
