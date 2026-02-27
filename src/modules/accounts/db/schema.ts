import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-arktype';
import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { auditFields } from '@/db/shared';
import { users } from '@/modules/auth/db/schema';

export const accountOwnerTypeEnum = pgEnum('account_owner_type', [
  'personal',
  'business',
]);

export const accountStatusEnum = pgEnum('account_status', ['active', 'closed']);

export const accountTypeEnum = pgEnum('account_type', [
  'checking',
  'savings',
  'credit_card',
  'loan',
  'cash',
  'investment',
  'other',
]);

export const creditCardCatalog = pgTable(
  'credit_card_catalog',
  {
    annualFeeCents: integer(),
    balanceTransferFeeBps: integer(),
    cashAdvanceAprBps: integer(),
    defaultAprBps: integer(),
    foreignTransactionFeeBps: integer(),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    issuer: text().notNull(),
    name: text().notNull(),
    network: text(),
    promoNotes: text(),
    rewardsType: text(),
    ...auditFields,
  },
  (table) => [
    uniqueIndex('credit_card_catalog_issuer_name_idx').on(
      table.issuer,
      table.name,
    ),
  ],
);

export const ledgerAccounts = pgTable(
  'ledger_accounts',
  {
    accountNumberMask: text(),
    closedAt: timestamp({ withTimezone: true }),
    creditCardCatalogId: uuid().references(() => creditCardCatalog.id, {
      onDelete: 'set null',
    }),
    currency: text().notNull(),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    institution: text(),
    name: text().notNull(),
    openedAt: timestamp({ withTimezone: true }),
    ownerType: accountOwnerTypeEnum().notNull().default('personal'),
    status: accountStatusEnum().notNull().default('active'),
    type: accountTypeEnum().notNull(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...auditFields,
  },
  (table) => [
    index('ledger_accounts_user_id_idx').on(table.userId),
    index('ledger_accounts_type_idx').on(table.type),
    index('ledger_accounts_user_active_idx')
      .on(table.userId)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const accountTerms = pgTable(
  'account_terms',
  {
    accountId: uuid()
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: 'cascade' }),
    aprBps: integer(),
    dueDay: integer(),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    minPaymentType: text(),
    minPaymentValue: integer(),
    statementDay: integer(),
    ...auditFields,
  },
  (table) => [uniqueIndex('account_terms_account_id_idx').on(table.accountId)],
);

export const accountBalanceSnapshots = pgTable(
  'account_balance_snapshots',
  {
    accountId: uuid()
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: 'cascade' }),
    balanceCents: integer().notNull(),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    recordedAt: timestamp({ withTimezone: true }).notNull(),
    source: text().notNull(),
    ...auditFields,
  },
  (table) => [
    index('account_balance_snapshots_account_id_idx').on(table.accountId),
  ],
);

export const creditCardCatalogSelectSchema =
  createSelectSchema(creditCardCatalog);
export const creditCardCatalogInsertSchema =
  createInsertSchema(creditCardCatalog);
export const creditCardCatalogUpdateSchema =
  createUpdateSchema(creditCardCatalog);
export const creditCardCatalogDeleteSchema =
  creditCardCatalogSelectSchema.pick('id');

export const ledgerAccountsSelectSchema = createSelectSchema(ledgerAccounts);
export const ledgerAccountsInsertSchema = createInsertSchema(ledgerAccounts);
export const ledgerAccountsUpdateSchema = createUpdateSchema(ledgerAccounts);
export const ledgerAccountsDeleteSchema = ledgerAccountsSelectSchema.pick('id');

export const accountTermsSelectSchema = createSelectSchema(accountTerms);
export const accountTermsInsertSchema = createInsertSchema(accountTerms);
export const accountTermsUpdateSchema = createUpdateSchema(accountTerms);
export const accountTermsDeleteSchema = accountTermsSelectSchema.pick('id');

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
