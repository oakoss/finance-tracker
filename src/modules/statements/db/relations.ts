import { relations } from 'drizzle-orm';

import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { users } from '@/modules/auth/db/schema';
import { attachments, statements } from '@/modules/statements/db/schema';
import { transactions } from '@/modules/transactions/db/schema';

export const statementsRelations = relations(statements, ({ many, one }) => ({
  account: one(ledgerAccounts, {
    fields: [statements.accountId],
    references: [ledgerAccounts.id],
  }),
  attachments: many(attachments),
  user: one(users, { fields: [statements.userId], references: [users.id] }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  statement: one(statements, {
    fields: [attachments.statementId],
    references: [statements.id],
  }),
  transaction: one(transactions, {
    fields: [attachments.transactionId],
    references: [transactions.id],
  }),
  user: one(users, { fields: [attachments.userId], references: [users.id] }),
}));
