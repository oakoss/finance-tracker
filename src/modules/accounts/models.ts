import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-arktype';

import {
  accountBalanceSnapshots,
  accountTerms,
  creditCardCatalog,
  ledgerAccounts,
} from '@/modules/accounts/db/schema';

export const creditCardCatalogSelectSchema =
  createSelectSchema(creditCardCatalog);
export const creditCardCatalogInsertSchema =
  createInsertSchema(creditCardCatalog);
export const creditCardCatalogUpdateSchema =
  createUpdateSchema(creditCardCatalog);
export const creditCardCatalogDeleteSchema =
  creditCardCatalogSelectSchema.pick('id');

export type CreditCardCatalog = typeof creditCardCatalogSelectSchema.infer;
export type CreditCardCatalogInsert =
  typeof creditCardCatalogInsertSchema.infer;

export const ledgerAccountsSelectSchema = createSelectSchema(ledgerAccounts);
export const ledgerAccountsInsertSchema = createInsertSchema(ledgerAccounts);
export const ledgerAccountsUpdateSchema = createUpdateSchema(ledgerAccounts);
export const ledgerAccountsDeleteSchema = ledgerAccountsSelectSchema.pick('id');

export type LedgerAccount = typeof ledgerAccountsSelectSchema.infer;
export type LedgerAccountInsert = typeof ledgerAccountsInsertSchema.infer;

export const accountTermsSelectSchema = createSelectSchema(accountTerms);
export const accountTermsInsertSchema = createInsertSchema(accountTerms);
export const accountTermsUpdateSchema = createUpdateSchema(accountTerms);
export const accountTermsDeleteSchema = accountTermsSelectSchema.pick('id');

export type AccountTerms = typeof accountTermsSelectSchema.infer;
export type AccountTermsInsert = typeof accountTermsInsertSchema.infer;

export const accountBalanceSnapshotsSelectSchema = createSelectSchema(
  accountBalanceSnapshots,
);
export const accountBalanceSnapshotsInsertSchema = createInsertSchema(
  accountBalanceSnapshots,
);
export const accountBalanceSnapshotsUpdateSchema = createUpdateSchema(
  accountBalanceSnapshots,
);
export const accountBalanceSnapshotsDeleteSchema =
  accountBalanceSnapshotsSelectSchema.pick('id');

export type AccountBalanceSnapshot =
  typeof accountBalanceSnapshotsSelectSchema.infer;
export type AccountBalanceSnapshotInsert =
  typeof accountBalanceSnapshotsInsertSchema.infer;
