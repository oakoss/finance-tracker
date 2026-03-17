import { relations } from 'drizzle-orm';

import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { users } from '@/modules/auth/db/schema';
import { importRows, imports } from '@/modules/imports/db/schema';
import { transactions } from '@/modules/transactions/db/schema';

export const importsRelations = relations(imports, ({ many, one }) => ({
  account: one(ledgerAccounts, {
    fields: [imports.accountId],
    references: [ledgerAccounts.id],
  }),
  rows: many(importRows),
  user: one(users, { fields: [imports.userId], references: [users.id] }),
}));

export const importRowsRelations = relations(importRows, ({ one }) => ({
  import: one(imports, {
    fields: [importRows.importId],
    references: [imports.id],
  }),
  transaction: one(transactions, {
    fields: [importRows.transactionId],
    references: [transactions.id],
  }),
}));
