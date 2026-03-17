import { relations } from 'drizzle-orm';

import {
  accountBalanceSnapshots,
  accountTerms,
  creditCardCatalog,
  ledgerAccounts,
} from '@/modules/accounts/db/schema';
import { users } from '@/modules/auth/db/schema';
import { debtStrategyOrder } from '@/modules/debt/db/schema';
import { imports } from '@/modules/imports/db/schema';
import { promotions } from '@/modules/promotions/db/schema';
import { statements } from '@/modules/statements/db/schema';
import { transactions } from '@/modules/transactions/db/schema';
import { transfers } from '@/modules/transfers/db/schema';

export const creditCardCatalogRelations = relations(
  creditCardCatalog,
  ({ many }) => ({ ledgerAccounts: many(ledgerAccounts) }),
);

export const ledgerAccountsRelations = relations(
  ledgerAccounts,
  ({ many, one }) => ({
    balanceSnapshots: many(accountBalanceSnapshots),
    creditCardCatalog: one(creditCardCatalog, {
      fields: [ledgerAccounts.creditCardCatalogId],
      references: [creditCardCatalog.id],
    }),
    debtStrategyOrders: many(debtStrategyOrder),
    imports: many(imports),
    promotions: many(promotions),
    statements: many(statements),
    terms: many(accountTerms),
    transactions: many(transactions),
    transfersFrom: many(transfers, { relationName: 'transferFrom' }),
    transfersTo: many(transfers, { relationName: 'transferTo' }),
    user: one(users, {
      fields: [ledgerAccounts.userId],
      references: [users.id],
    }),
  }),
);

export const accountTermsRelations = relations(accountTerms, ({ one }) => ({
  account: one(ledgerAccounts, {
    fields: [accountTerms.accountId],
    references: [ledgerAccounts.id],
  }),
}));

export const accountBalanceSnapshotsRelations = relations(
  accountBalanceSnapshots,
  ({ one }) => ({
    account: one(ledgerAccounts, {
      fields: [accountBalanceSnapshots.accountId],
      references: [ledgerAccounts.id],
    }),
  }),
);
