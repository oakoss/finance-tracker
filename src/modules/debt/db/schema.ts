import { sql } from 'drizzle-orm';
import {
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

export const debtStrategyTypeEnum = pgEnum('debt_strategy_type', [
  'snowball',
  'avalanche',
  'custom',
]);

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
