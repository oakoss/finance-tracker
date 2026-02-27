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

import { auditFields } from '@/db/shared';
import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { users } from '@/modules/auth/db/schema';

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

export const categories = pgTable(
  'categories',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    name: text().notNull(),
    parentId: uuid(),
    type: categoryTypeEnum().notNull(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...auditFields,
  },
  (table) => [
    index('categories_user_id_idx').on(table.userId),
    uniqueIndex('categories_user_name_idx').on(table.userId, table.name),
    index('categories_user_active_idx')
      .on(table.userId)
      .where(sql`${table.deletedAt} is null`),
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
    name: text().notNull(),
    normalizedName: text(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...auditFields,
  },
  (table) => [
    index('payees_user_id_idx').on(table.userId),
    uniqueIndex('payees_user_name_idx').on(table.userId, table.name),
    index('payees_user_active_idx')
      .on(table.userId)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const payeeAliases = pgTable(
  'payee_aliases',
  {
    alias: text().notNull(),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    payeeId: uuid()
      .notNull()
      .references(() => payees.id, { onDelete: 'cascade' }),
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
    name: text().notNull(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...auditFields,
  },
  (table) => [
    index('tags_user_id_idx').on(table.userId),
    uniqueIndex('tags_user_name_idx').on(table.userId, table.name),
    index('tags_user_active_idx')
      .on(table.userId)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const transfers = pgTable(
  'transfers',
  {
    amountCents: integer().notNull(),
    fromAccountId: uuid()
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: 'cascade' }),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    memo: text(),
    toAccountId: uuid()
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: 'cascade' }),
    transferAt: timestamp({ withTimezone: true }).notNull(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
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
    accountId: uuid()
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: 'cascade' }),
    amountCents: integer().notNull(),
    balanceCents: integer(),
    categoryId: uuid().references(() => categories.id, {
      onDelete: 'set null',
    }),
    currency: text(),
    description: text().notNull(),
    direction: transactionDirectionEnum(),
    externalId: text(),
    fingerprint: text(),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    memo: text(),
    payeeId: uuid().references(() => payees.id, { onDelete: 'set null' }),
    payeeNameRaw: text(),
    pending: boolean().notNull().default(false),
    postedAt: timestamp({ withTimezone: true }).notNull(),
    transactionAt: timestamp({ withTimezone: true }).notNull(),
    transferId: uuid().references(() => transfers.id, { onDelete: 'set null' }),
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
    tagId: uuid()
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    transactionId: uuid()
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
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
    accountId: uuid()
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: 'cascade' }),
    fileHash: text(),
    fileName: text(),
    finishedAt: timestamp({ withTimezone: true }),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    importedAt: timestamp({ withTimezone: true }).defaultNow(),
    source: importSourceEnum().notNull(),
    startedAt: timestamp({ withTimezone: true }),
    status: importStatusEnum().notNull().default('pending'),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...auditFields,
  },
  (table) => [
    index('imports_user_id_idx').on(table.userId),
    index('imports_account_id_idx').on(table.accountId),
  ],
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
    normalizedData: jsonb(),
    rawData: jsonb().notNull(),
    rowIndex: integer().notNull(),
    status: importRowStatusEnum().notNull().default('mapped'),
    transactionId: uuid().references(() => transactions.id, {
      onDelete: 'set null',
    }),
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
    accountId: uuid()
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: 'cascade' }),
    description: text(),
    endDate: timestamp({ withTimezone: true }).notNull(),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    promoAprBps: integer().notNull(),
    promoLimitCents: integer(),
    promoType: promoTypeEnum().notNull(),
    startDate: timestamp({ withTimezone: true }).notNull(),
    ...auditFields,
  },
  (table) => [index('promotions_account_id_idx').on(table.accountId)],
);

export const promoBuckets = pgTable(
  'promo_buckets',
  {
    closedAt: timestamp({ withTimezone: true }),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    name: text().notNull(),
    openedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    principalCents: integer().notNull(),
    promotionId: uuid()
      .notNull()
      .references(() => promotions.id, { onDelete: 'cascade' }),
    ...auditFields,
  },
  (table) => [index('promo_buckets_promotion_id_idx').on(table.promotionId)],
);

export const promoBucketTransactions = pgTable(
  'promo_bucket_transactions',
  {
    amountCents: integer().notNull(),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    promoBucketId: uuid()
      .notNull()
      .references(() => promoBuckets.id, { onDelete: 'cascade' }),
    transactionId: uuid()
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
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
    name: text().notNull(),
    strategyType: debtStrategyTypeEnum().notNull(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...auditFields,
  },
  (table) => [index('debt_strategies_user_id_idx').on(table.userId)],
);

export const debtStrategyOrder = pgTable(
  'debt_strategy_order',
  {
    accountId: uuid()
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: 'cascade' }),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    overrideAprBps: integer(),
    rank: integer().notNull(),
    strategyId: uuid()
      .notNull()
      .references(() => debtStrategies.id, { onDelete: 'cascade' }),
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
    resultData: jsonb().notNull(),
    runAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    snapshotData: jsonb().notNull(),
    strategyId: uuid()
      .notNull()
      .references(() => debtStrategies.id, { onDelete: 'cascade' }),
    ...auditFields,
  },
  (table) => [index('debt_strategy_runs_strategy_id_idx').on(table.strategyId)],
);

export const userPreferences = pgTable('user_preferences', {
  activeDebtStrategyId: uuid().references(() => debtStrategies.id, {
    onDelete: 'set null',
  }),
  dateFormat: text(),
  defaultCurrency: text().notNull().default('USD'),
  locale: text().notNull().default('en-US'),
  numberFormat: text(),
  onboardingCompletedAt: timestamp({ withTimezone: true }),
  timeZone: text().notNull().default('UTC'),
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  ...auditFields,
});

export const recurringRules = pgTable(
  'recurring_rules',
  {
    accountId: uuid().references(() => ledgerAccounts.id, {
      onDelete: 'set null',
    }),
    amountCents: integer(),
    categoryId: uuid().references(() => categories.id, {
      onDelete: 'set null',
    }),
    description: text(),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    interval: recurrenceIntervalEnum().notNull(),
    name: text().notNull(),
    nextRunAt: timestamp({ withTimezone: true }),
    payeeId: uuid().references(() => payees.id, { onDelete: 'set null' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...auditFields,
  },
  (table) => [index('recurring_rules_user_id_idx').on(table.userId)],
);

export const merchantRules = pgTable(
  'merchant_rules',
  {
    categoryId: uuid().references(() => categories.id, {
      onDelete: 'set null',
    }),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    isActive: boolean().notNull().default(true),
    matchType: merchantMatchTypeEnum().notNull(),
    matchValue: text().notNull(),
    payeeId: uuid().references(() => payees.id, { onDelete: 'set null' }),
    priority: integer().notNull().default(0),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
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
    accountId: uuid()
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: 'cascade' }),
    fileHash: text(),
    fileName: text(),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    periodEnd: timestamp({ withTimezone: true }).notNull(),
    periodStart: timestamp({ withTimezone: true }).notNull(),
    source: statementSourceEnum().notNull(),
    statementDate: timestamp({ withTimezone: true }),
    uploadedAt: timestamp({ withTimezone: true }).defaultNow(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
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
    fileName: text().notNull(),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    mimeType: text().notNull(),
    sizeBytes: integer().notNull(),
    statementId: uuid().references(() => statements.id, {
      onDelete: 'set null',
    }),
    storageKey: text().notNull(),
    transactionId: uuid().references(() => transactions.id, {
      onDelete: 'set null',
    }),
    uploadedAt: timestamp({ withTimezone: true }).defaultNow(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
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
    action: auditActionEnum().notNull(),
    actorId: uuid().references(() => users.id, { onDelete: 'set null' }),
    afterData: jsonb(),
    beforeData: jsonb(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    recordId: uuid().notNull(),
    tableName: text().notNull(),
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
