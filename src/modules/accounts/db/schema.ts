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

export const accountMinPaymentTypeEnum = pgEnum('account_min_payment_type', [
  'percentage',
  'fixed',
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

export const accountTermsIndexNames = {
  accountIdIdx: 'account_terms_account_id_idx',
} as const;

export const accountsConstraintMessages = {
  [accountTermsIndexNames.accountIdIdx]:
    'This account already has terms. Edit existing terms.',
} as const;

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
    minPaymentType: accountMinPaymentTypeEnum(),
    minPaymentValue: integer(),
    statementDay: integer(),
    ...auditFields,
  },
  (table) => [
    uniqueIndex(accountTermsIndexNames.accountIdIdx).on(table.accountId),
  ],
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
