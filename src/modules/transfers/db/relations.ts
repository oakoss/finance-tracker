import { relations } from 'drizzle-orm';

import { users } from '@/modules/auth/db/schema';
import { merchantRules } from '@/modules/rules/db/schema';
import { transactions } from '@/modules/transactions/db/schema';
import { transferDismissals, transfers } from '@/modules/transfers/db/schema';

export const transfersRelations = relations(transfers, ({ one }) => ({
  detectedByRule: one(merchantRules, {
    fields: [transfers.detectedByRuleId],
    references: [merchantRules.id],
  }),
  fromTransaction: one(transactions, {
    fields: [transfers.fromTransactionId],
    references: [transactions.id],
    relationName: 'transferFromTransaction',
  }),
  toTransaction: one(transactions, {
    fields: [transfers.toTransactionId],
    references: [transactions.id],
    relationName: 'transferToTransaction',
  }),
  user: one(users, { fields: [transfers.userId], references: [users.id] }),
}));

export const transferDismissalsRelations = relations(
  transferDismissals,
  ({ one }) => ({
    txnA: one(transactions, {
      fields: [transferDismissals.txnAId],
      references: [transactions.id],
      relationName: 'transferDismissalTxnA',
    }),
    txnB: one(transactions, {
      fields: [transferDismissals.txnBId],
      references: [transactions.id],
      relationName: 'transferDismissalTxnB',
    }),
    user: one(users, {
      fields: [transferDismissals.userId],
      references: [users.id],
    }),
  }),
);
