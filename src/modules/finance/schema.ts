import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-arktype';
import { sql } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { users } from '@/modules/auth/schema';

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

export const auditActionEnum = pgEnum('audit_action', [
  'create',
  'update',
  'delete',
]);

export const categoryTypeEnum = pgEnum('category_type', [
  'income',
  'expense',
  'transfer',
]);

export const debtStrategyTypeEnum = pgEnum('debt_strategy_type', [
  'snowball',
  'avalanche',
  'custom',
]);

export const importSourceEnum = pgEnum('import_source', [
  'csv',
  'manual',
  'pdf',
]);

export const importStatusEnum = pgEnum('import_status', [
  'pending',
  'processing',
  'completed',
  'failed',
]);

export const importRowStatusEnum = pgEnum('import_row_status', [
  'mapped',
  'ignored',
  'duplicate',
  'error',
]);

export const merchantMatchTypeEnum = pgEnum('merchant_match_type', [
  'contains',
  'starts_with',
  'ends_with',
  'exact',
  'regex',
]);

export const promoTypeEnum = pgEnum('promo_type', [
  'purchase_0_apr',
  'balance_transfer_0_apr',
  'deferred_interest',
]);

export const recurrenceIntervalEnum = pgEnum('recurrence_interval', [
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
  'custom',
]);

export const statementSourceEnum = pgEnum('statement_source', ['pdf', 'csv']);

export const transactionDirectionEnum = pgEnum('transaction_direction', [
  'debit',
  'credit',
]);

const auditFields = {
  createdById: uuid().references(() => users.id, { onDelete: 'set null' }),
  updatedById: uuid().references(() => users.id, { onDelete: 'set null' }),
  deletedById: uuid().references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp({ withTimezone: true }),
};

export const creditCardCatalog = pgTable(
  'credit_card_catalog',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    issuer: text().notNull(),
    name: text().notNull(),
    network: text(),
    defaultAprBps: integer(),
    cashAdvanceAprBps: integer(),
    balanceTransferFeeBps: integer(),
    foreignTransactionFeeBps: integer(),
    annualFeeCents: integer(),
    rewardsType: text(),
    promoNotes: text(),
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
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    creditCardCatalogId: uuid().references(() => creditCardCatalog.id, {
      onDelete: 'set null',
    }),
    name: text().notNull(),
    type: accountTypeEnum().notNull(),
    ownerType: accountOwnerTypeEnum().notNull().default('personal'),
    status: accountStatusEnum().notNull().default('active'),
    institution: text(),
    currency: text().notNull(),
    accountNumberMask: text(),
    openedAt: timestamp({ withTimezone: true }),
    closedAt: timestamp({ withTimezone: true }),
    ...auditFields,
  },
  (table) => [
    index('ledger_accounts_user_id_idx').on(table.userId),
    index('ledger_accounts_type_idx').on(table.type),
  ],
);

export const accountTerms = pgTable('account_terms', {
  id: uuid()
    .primaryKey()
    .default(sql`uuidv7()`),
  accountId: uuid()
    .notNull()
    .references(() => ledgerAccounts.id, { onDelete: 'cascade' }),
  aprBps: integer(),
  minPaymentType: text(),
  minPaymentValue: integer(),
  statementDay: integer(),
  dueDay: integer(),
  ...auditFields,
});

export const accountBalanceSnapshots = pgTable(
  'account_balance_snapshots',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    accountId: uuid()
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: 'cascade' }),
    balanceCents: integer().notNull(),
    recordedAt: timestamp({ withTimezone: true }).notNull(),
    source: text().notNull(),
    ...auditFields,
  },
  (table) => [
    index('account_balance_snapshots_account_id_idx').on(table.accountId),
  ],
);

export const categories = pgTable(
  'categories',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    type: categoryTypeEnum().notNull(),
    parentId: uuid(),
    ...auditFields,
  },
  (table) => [
    index('categories_user_id_idx').on(table.userId),
    uniqueIndex('categories_user_name_idx').on(table.userId, table.name),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
    }).onDelete('set null'),
  ],
);

export const payees = pgTable(
  'payees',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    normalizedName: text(),
    ...auditFields,
  },
  (table) => [
    index('payees_user_id_idx').on(table.userId),
    uniqueIndex('payees_user_name_idx').on(table.userId, table.name),
  ],
);

export const payeeAliases = pgTable(
  'payee_aliases',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    payeeId: uuid()
      .notNull()
      .references(() => payees.id, { onDelete: 'cascade' }),
    alias: text().notNull(),
    ...auditFields,
  },
  (table) => [
    index('payee_aliases_payee_id_idx').on(table.payeeId),
    uniqueIndex('payee_aliases_payee_alias_idx').on(table.payeeId, table.alias),
  ],
);

export const tags = pgTable(
  'tags',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    ...auditFields,
  },
  (table) => [
    index('tags_user_id_idx').on(table.userId),
    uniqueIndex('tags_user_name_idx').on(table.userId, table.name),
  ],
);

export const transfers = pgTable(
  'transfers',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fromAccountId: uuid()
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: 'cascade' }),
    toAccountId: uuid()
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: 'cascade' }),
    transferAt: timestamp({ withTimezone: true }).notNull(),
    amountCents: integer().notNull(),
    memo: text(),
    ...auditFields,
  },
  (table) => [
    index('transfers_user_id_idx').on(table.userId),
    index('transfers_from_account_id_idx').on(table.fromAccountId),
    index('transfers_to_account_id_idx').on(table.toAccountId),
  ],
);

export const transactions = pgTable(
  'transactions',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    accountId: uuid()
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: 'cascade' }),
    categoryId: uuid().references(() => categories.id, {
      onDelete: 'set null',
    }),
    payeeId: uuid().references(() => payees.id, { onDelete: 'set null' }),
    transferId: uuid().references(() => transfers.id, { onDelete: 'set null' }),
    postedAt: timestamp({ withTimezone: true }).notNull(),
    transactionAt: timestamp({ withTimezone: true }).notNull(),
    amountCents: integer().notNull(),
    balanceCents: integer(),
    currency: text(),
    direction: transactionDirectionEnum(),
    description: text().notNull(),
    payeeNameRaw: text(),
    memo: text(),
    pending: boolean().notNull().default(false),
    externalId: text(),
    fingerprint: text(),
    ...auditFields,
  },
  (table) => [
    index('transactions_account_id_idx').on(table.accountId),
    index('transactions_account_posted_at_idx').on(
      table.accountId,
      table.postedAt,
    ),
    index('transactions_account_transaction_at_idx').on(
      table.accountId,
      table.transactionAt,
    ),
    index('transactions_account_active_posted_at_idx')
      .on(table.accountId, table.postedAt)
      .where(sql`${table.deletedAt} is null`),
    index('transactions_description_search_idx').using(
      'gin',
      sql`to_tsvector('english', ${table.description})`,
    ),
    index('transactions_category_id_idx').on(table.categoryId),
    index('transactions_payee_id_idx').on(table.payeeId),
    index('transactions_transfer_id_idx').on(table.transferId),
    uniqueIndex('transactions_account_external_id_idx').on(
      table.accountId,
      table.externalId,
    ),
    uniqueIndex('transactions_account_fingerprint_idx').on(
      table.accountId,
      table.fingerprint,
    ),
  ],
);

export const transactionTags = pgTable(
  'transaction_tags',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    transactionId: uuid()
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    tagId: uuid()
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    ...auditFields,
  },
  (table) => [
    index('transaction_tags_transaction_id_idx').on(table.transactionId),
    index('transaction_tags_tag_id_idx').on(table.tagId),
    uniqueIndex('transaction_tags_unique_idx').on(
      table.transactionId,
      table.tagId,
    ),
  ],
);

export const imports = pgTable(
  'imports',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    source: importSourceEnum().notNull(),
    status: importStatusEnum().notNull().default('pending'),
    fileName: text(),
    fileHash: text(),
    startedAt: timestamp({ withTimezone: true }),
    finishedAt: timestamp({ withTimezone: true }),
    importedAt: timestamp({ withTimezone: true }).defaultNow(),
    ...auditFields,
  },
  (table) => [index('imports_user_id_idx').on(table.userId)],
);

export const importRows = pgTable(
  'import_rows',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    importId: uuid()
      .notNull()
      .references(() => imports.id, { onDelete: 'cascade' }),
    transactionId: uuid().references(() => transactions.id, {
      onDelete: 'set null',
    }),
    rowIndex: integer().notNull(),
    rawData: jsonb().notNull(),
    normalizedData: jsonb(),
    status: importRowStatusEnum().notNull().default('mapped'),
    ...auditFields,
  },
  (table) => [
    index('import_rows_import_id_idx').on(table.importId),
    index('import_rows_transaction_id_idx').on(table.transactionId),
  ],
);

export const promotions = pgTable(
  'promotions',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    accountId: uuid()
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: 'cascade' }),
    promoType: promoTypeEnum().notNull(),
    startDate: timestamp({ withTimezone: true }).notNull(),
    endDate: timestamp({ withTimezone: true }).notNull(),
    promoAprBps: integer().notNull(),
    promoLimitCents: integer(),
    description: text(),
    ...auditFields,
  },
  (table) => [index('promotions_account_id_idx').on(table.accountId)],
);

export const promoBuckets = pgTable(
  'promo_buckets',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    promotionId: uuid()
      .notNull()
      .references(() => promotions.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    principalCents: integer().notNull(),
    openedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp({ withTimezone: true }),
    ...auditFields,
  },
  (table) => [index('promo_buckets_promotion_id_idx').on(table.promotionId)],
);

export const promoBucketTransactions = pgTable(
  'promo_bucket_transactions',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    promoBucketId: uuid()
      .notNull()
      .references(() => promoBuckets.id, { onDelete: 'cascade' }),
    transactionId: uuid()
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    amountCents: integer().notNull(),
    ...auditFields,
  },
  (table) => [
    index('promo_bucket_transactions_bucket_id_idx').on(table.promoBucketId),
    index('promo_bucket_transactions_transaction_id_idx').on(
      table.transactionId,
    ),
    uniqueIndex('promo_bucket_transactions_unique_idx').on(
      table.promoBucketId,
      table.transactionId,
    ),
  ],
);

export const debtStrategies = pgTable(
  'debt_strategies',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    strategyType: debtStrategyTypeEnum().notNull(),
    ...auditFields,
  },
  (table) => [index('debt_strategies_user_id_idx').on(table.userId)],
);

export const debtStrategyOrder = pgTable(
  'debt_strategy_order',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    strategyId: uuid()
      .notNull()
      .references(() => debtStrategies.id, { onDelete: 'cascade' }),
    accountId: uuid()
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: 'cascade' }),
    rank: integer().notNull(),
    overrideAprBps: integer(),
    ...auditFields,
  },
  (table) => [
    index('debt_strategy_order_strategy_id_idx').on(table.strategyId),
    index('debt_strategy_order_account_id_idx').on(table.accountId),
    uniqueIndex('debt_strategy_order_unique_idx').on(
      table.strategyId,
      table.accountId,
    ),
  ],
);

export const debtStrategyRuns = pgTable(
  'debt_strategy_runs',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    strategyId: uuid()
      .notNull()
      .references(() => debtStrategies.id, { onDelete: 'cascade' }),
    runAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    snapshotData: jsonb().notNull(),
    resultData: jsonb().notNull(),
    ...auditFields,
  },
  (table) => [index('debt_strategy_runs_strategy_id_idx').on(table.strategyId)],
);

export const userPreferences = pgTable('user_preferences', {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  defaultCurrency: text().notNull().default('USD'),
  locale: text().notNull().default('en-US'),
  timeZone: text().notNull().default('UTC'),
  dateFormat: text(),
  numberFormat: text(),
  onboardingCompletedAt: timestamp({ withTimezone: true }),
  activeDebtStrategyId: uuid().references(() => debtStrategies.id, {
    onDelete: 'set null',
  }),
  ...auditFields,
});

export const recurringRules = pgTable(
  'recurring_rules',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: uuid().references(() => ledgerAccounts.id, {
      onDelete: 'set null',
    }),
    categoryId: uuid().references(() => categories.id, {
      onDelete: 'set null',
    }),
    payeeId: uuid().references(() => payees.id, { onDelete: 'set null' }),
    name: text().notNull(),
    description: text(),
    interval: recurrenceIntervalEnum().notNull(),
    amountCents: integer(),
    nextRunAt: timestamp({ withTimezone: true }),
    ...auditFields,
  },
  (table) => [index('recurring_rules_user_id_idx').on(table.userId)],
);

export const merchantRules = pgTable(
  'merchant_rules',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    matchType: merchantMatchTypeEnum().notNull(),
    matchValue: text().notNull(),
    payeeId: uuid().references(() => payees.id, { onDelete: 'set null' }),
    categoryId: uuid().references(() => categories.id, {
      onDelete: 'set null',
    }),
    priority: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    ...auditFields,
  },
  (table) => [
    index('merchant_rules_user_id_idx').on(table.userId),
    index('merchant_rules_payee_id_idx').on(table.payeeId),
    index('merchant_rules_category_id_idx').on(table.categoryId),
  ],
);

export const statements = pgTable(
  'statements',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: uuid()
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: 'cascade' }),
    source: statementSourceEnum().notNull(),
    fileName: text(),
    fileHash: text(),
    periodStart: timestamp({ withTimezone: true }).notNull(),
    periodEnd: timestamp({ withTimezone: true }).notNull(),
    statementDate: timestamp({ withTimezone: true }),
    uploadedAt: timestamp({ withTimezone: true }).defaultNow(),
    ...auditFields,
  },
  (table) => [
    index('statements_user_id_idx').on(table.userId),
    index('statements_account_id_idx').on(table.accountId),
  ],
);

export const attachments = pgTable(
  'attachments',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    transactionId: uuid().references(() => transactions.id, {
      onDelete: 'set null',
    }),
    statementId: uuid().references(() => statements.id, {
      onDelete: 'set null',
    }),
    fileName: text().notNull(),
    storageKey: text().notNull(),
    mimeType: text().notNull(),
    sizeBytes: integer().notNull(),
    uploadedAt: timestamp({ withTimezone: true }).defaultNow(),
    ...auditFields,
  },
  (table) => [
    index('attachments_user_id_idx').on(table.userId),
    index('attachments_transaction_id_idx').on(table.transactionId),
    index('attachments_statement_id_idx').on(table.statementId),
  ],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    actorId: uuid().references(() => users.id, { onDelete: 'set null' }),
    action: auditActionEnum().notNull(),
    tableName: text().notNull(),
    recordId: uuid().notNull(),
    beforeData: jsonb(),
    afterData: jsonb(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_logs_actor_id_idx').on(table.actorId),
    index('audit_logs_table_name_idx').on(table.tableName),
    index('audit_logs_record_id_idx').on(table.recordId),
  ],
);

export const userPreferencesSelectSchema = createSelectSchema(userPreferences);
export const userPreferencesInsertSchema = createInsertSchema(userPreferences);
export const userPreferencesUpdateSchema = createUpdateSchema(userPreferences);
export const userPreferencesDeleteSchema =
  userPreferencesSelectSchema.pick('userId');

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

export const categoriesSelectSchema = createSelectSchema(categories);
export const categoriesInsertSchema = createInsertSchema(categories);
export const categoriesUpdateSchema = createUpdateSchema(categories);
export const categoriesDeleteSchema = categoriesSelectSchema.pick('id');

export const payeesSelectSchema = createSelectSchema(payees);
export const payeesInsertSchema = createInsertSchema(payees);
export const payeesUpdateSchema = createUpdateSchema(payees);
export const payeesDeleteSchema = payeesSelectSchema.pick('id');

export const payeeAliasesSelectSchema = createSelectSchema(payeeAliases);
export const payeeAliasesInsertSchema = createInsertSchema(payeeAliases);
export const payeeAliasesUpdateSchema = createUpdateSchema(payeeAliases);
export const payeeAliasesDeleteSchema = payeeAliasesSelectSchema.pick('id');

export const tagsSelectSchema = createSelectSchema(tags);
export const tagsInsertSchema = createInsertSchema(tags);
export const tagsUpdateSchema = createUpdateSchema(tags);
export const tagsDeleteSchema = tagsSelectSchema.pick('id');

export const transfersSelectSchema = createSelectSchema(transfers);
export const transfersInsertSchema = createInsertSchema(transfers);
export const transfersUpdateSchema = createUpdateSchema(transfers);
export const transfersDeleteSchema = transfersSelectSchema.pick('id');

export const transactionsSelectSchema = createSelectSchema(transactions);
export const transactionsInsertSchema = createInsertSchema(transactions);
export const transactionsUpdateSchema = createUpdateSchema(transactions);
export const transactionsDeleteSchema = transactionsSelectSchema.pick('id');

export const transactionTagsSelectSchema = createSelectSchema(transactionTags);
export const transactionTagsInsertSchema = createInsertSchema(transactionTags);
export const transactionTagsUpdateSchema = createUpdateSchema(transactionTags);
export const transactionTagsDeleteSchema =
  transactionTagsSelectSchema.pick('id');

export const importsSelectSchema = createSelectSchema(imports);
export const importsInsertSchema = createInsertSchema(imports);
export const importsUpdateSchema = createUpdateSchema(imports);
export const importsDeleteSchema = importsSelectSchema.pick('id');

export const importRowsSelectSchema = createSelectSchema(importRows);
export const importRowsInsertSchema = createInsertSchema(importRows);
export const importRowsUpdateSchema = createUpdateSchema(importRows);
export const importRowsDeleteSchema = importRowsSelectSchema.pick('id');

export const promotionsSelectSchema = createSelectSchema(promotions);
export const promotionsInsertSchema = createInsertSchema(promotions);
export const promotionsUpdateSchema = createUpdateSchema(promotions);
export const promotionsDeleteSchema = promotionsSelectSchema.pick('id');

export const promoBucketsSelectSchema = createSelectSchema(promoBuckets);
export const promoBucketsInsertSchema = createInsertSchema(promoBuckets);
export const promoBucketsUpdateSchema = createUpdateSchema(promoBuckets);
export const promoBucketsDeleteSchema = promoBucketsSelectSchema.pick('id');

export const promoBucketTransactionsSelectSchema = createSelectSchema(
  promoBucketTransactions,
);
export const promoBucketTransactionsInsertSchema = createInsertSchema(
  promoBucketTransactions,
);
export const promoBucketTransactionsUpdateSchema = createUpdateSchema(
  promoBucketTransactions,
);
export const promoBucketTransactionsDeleteSchema =
  promoBucketTransactionsSelectSchema.pick('id');

export const debtStrategiesSelectSchema = createSelectSchema(debtStrategies);
export const debtStrategiesInsertSchema = createInsertSchema(debtStrategies);
export const debtStrategiesUpdateSchema = createUpdateSchema(debtStrategies);
export const debtStrategiesDeleteSchema = debtStrategiesSelectSchema.pick('id');

export const debtStrategyOrderSelectSchema =
  createSelectSchema(debtStrategyOrder);
export const debtStrategyOrderInsertSchema =
  createInsertSchema(debtStrategyOrder);
export const debtStrategyOrderUpdateSchema =
  createUpdateSchema(debtStrategyOrder);
export const debtStrategyOrderDeleteSchema =
  debtStrategyOrderSelectSchema.pick('id');

export const debtStrategyRunsSelectSchema =
  createSelectSchema(debtStrategyRuns);
export const debtStrategyRunsInsertSchema =
  createInsertSchema(debtStrategyRuns);
export const debtStrategyRunsUpdateSchema =
  createUpdateSchema(debtStrategyRuns);
export const debtStrategyRunsDeleteSchema =
  debtStrategyRunsSelectSchema.pick('id');

export const recurringRulesSelectSchema = createSelectSchema(recurringRules);
export const recurringRulesInsertSchema = createInsertSchema(recurringRules);
export const recurringRulesUpdateSchema = createUpdateSchema(recurringRules);
export const recurringRulesDeleteSchema = recurringRulesSelectSchema.pick('id');

export const merchantRulesSelectSchema = createSelectSchema(merchantRules);
export const merchantRulesInsertSchema = createInsertSchema(merchantRules);
export const merchantRulesUpdateSchema = createUpdateSchema(merchantRules);
export const merchantRulesDeleteSchema = merchantRulesSelectSchema.pick('id');

export const statementsSelectSchema = createSelectSchema(statements);
export const statementsInsertSchema = createInsertSchema(statements);
export const statementsUpdateSchema = createUpdateSchema(statements);
export const statementsDeleteSchema = statementsSelectSchema.pick('id');

export const attachmentsSelectSchema = createSelectSchema(attachments);
export const attachmentsInsertSchema = createInsertSchema(attachments);
export const attachmentsUpdateSchema = createUpdateSchema(attachments);
export const attachmentsDeleteSchema = attachmentsSelectSchema.pick('id');

export const auditLogsSelectSchema = createSelectSchema(auditLogs);
export const auditLogsInsertSchema = createInsertSchema(auditLogs);
export const auditLogsUpdateSchema = createUpdateSchema(auditLogs);
export const auditLogsDeleteSchema = auditLogsSelectSchema.pick('id');
