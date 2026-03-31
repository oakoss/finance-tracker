import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import type { TargetField } from '@/modules/imports/constants';

import { auditFields } from '@/db/shared';
import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { users } from '@/modules/auth/db/schema';
import { transactions } from '@/modules/transactions/db/schema';

export type ColumnMappingDb = {
  amountMode: 'single' | 'split';
  mapping: Record<string, TargetField>;
};

export const importSourceEnum = pgEnum('import_source', [
  'csv',
  'manual',
  'pdf',
]);

export const importStatusEnum = pgEnum('import_status', [
  'pending',
  'processing',
  'completed',
  'committed',
  'failed',
]);

export const importRowStatusEnum = pgEnum('import_row_status', [
  'mapped',
  'ignored',
  'duplicate',
  'error',
  'committed',
]);

export const imports = pgTable(
  'imports',
  {
    accountId: uuid()
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: 'cascade' }),
    columnMapping: jsonb().$type<ColumnMappingDb>(),
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
    index('imports_account_id_idx').on(table.accountId),
    index('imports_user_file_hash_idx').on(table.userId, table.fileHash),
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
