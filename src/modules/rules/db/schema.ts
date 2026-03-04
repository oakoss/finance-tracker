import { sql } from 'drizzle-orm';
import {
  boolean,
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
import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { users } from '@/modules/auth/db/schema';
import { categories } from '@/modules/categories/db/schema';
import { payees } from '@/modules/transactions/db/schema';

export const merchantMatchTypeEnum = pgEnum('merchant_match_type', [
  'contains',
  'starts_with',
  'ends_with',
  'exact',
  'regex',
]);

export const recurrenceIntervalEnum = pgEnum('recurrence_interval', [
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
  'custom',
]);

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
