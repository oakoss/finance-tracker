import { relations } from 'drizzle-orm';

import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { users } from '@/modules/auth/db/schema';
import { transactions } from '@/modules/transactions/db/schema';
import { transfers } from '@/modules/transfers/db/schema';

export const transfersRelations = relations(transfers, ({ many, one }) => ({
  fromAccount: one(ledgerAccounts, {
    fields: [transfers.fromAccountId],
    references: [ledgerAccounts.id],
    relationName: 'transferFrom',
  }),
  toAccount: one(ledgerAccounts, {
    fields: [transfers.toAccountId],
    references: [ledgerAccounts.id],
    relationName: 'transferTo',
  }),
  transactions: many(transactions),
  user: one(users, { fields: [transfers.userId], references: [users.id] }),
}));
