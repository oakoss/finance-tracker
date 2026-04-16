import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
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

// Type-only import avoids a runtime cycle: models.ts imports the
// tables from here, and this file borrows the derived TS types for
// `$type<T>()` on the jsonb columns.
import type {
  MatchPredicate,
  RuleAction,
  RuleRunUndo,
} from '@/modules/rules/models';

import { auditFields } from '@/db/shared';
import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { users } from '@/modules/auth/db/schema';
import { categories } from '@/modules/categories/db/schema';
import { payees } from '@/modules/payees/db/schema';

export const ruleStageEnum = pgEnum('rule_stage', ['pre', 'default', 'post']);

export const recurrenceIntervalEnum = pgEnum('recurrence_interval', [
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
  'custom',
]);

export const merchantRulesIndexNames = {
  userActiveIdx: 'merchant_rules_user_active_idx',
  userStagePriorityIdx: 'merchant_rules_user_stage_priority_idx',
} as const;

export const ruleRunsIndexNames = {
  ruleRunAtIdx: 'rule_runs_rule_run_at_idx',
} as const;

export const rulesConstraintMessages = {
  merchant_rules_actions_nonempty_check:
    'A merchant rule must have at least one action.',
  rule_runs_undo_data_shape_check:
    'Rule-run undo data must be an object containing a transactions array.',
} as const;

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
    actions: jsonb().$type<RuleAction[]>().notNull(),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    isActive: boolean().notNull().default(true),
    match: jsonb().$type<MatchPredicate>().notNull(),
    priority: integer().notNull().default(0),
    stage: ruleStageEnum().notNull().default('default'),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...auditFields,
  },
  (table) => [
    index(merchantRulesIndexNames.userStagePriorityIdx).on(
      table.userId,
      table.stage,
      table.priority,
    ),
    index(merchantRulesIndexNames.userActiveIdx)
      .on(table.userId)
      .where(sql`${table.isActive} = true`),
    // Mirrors `ruleActionsSchema.atLeastLength(1)` in models.ts — keep
    // the non-empty invariant in sync across both layers.
    check(
      'merchant_rules_actions_nonempty_check',
      sql`jsonb_typeof(${table.actions}) = 'array' AND jsonb_array_length(${table.actions}) > 0`,
    ),
  ],
);

export const ruleRuns = pgTable(
  'rule_runs',
  {
    affectedTransactionIds: uuid()
      .array()
      .notNull()
      .default(sql`ARRAY[]::uuid[]`),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    ruleId: uuid()
      .notNull()
      .references(() => merchantRules.id, { onDelete: 'cascade' }),
    runAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    undoableUntil: timestamp({ withTimezone: true })
      .notNull()
      .default(sql`now() + interval '5 minutes'`),
    undoData: jsonb().$type<RuleRunUndo>().notNull(),
    undoneAt: timestamp({ withTimezone: true }),
    ...auditFields,
  },
  (table) => [
    index(ruleRunsIndexNames.ruleRunAtIdx).on(
      table.ruleId,
      sql`${table.runAt} DESC`,
    ),
    // Mirrors `ruleRunUndoSchema` shape guard in models.ts — keep the
    // "transactions is an array" invariant in sync across both layers.
    // The explicit `? 'transactions'` guard short-circuits the type
    // check when the key is missing (otherwise `jsonb_typeof(NULL)` is
    // NULL, which CHECK treats as passing).
    check(
      'rule_runs_undo_data_shape_check',
      sql`jsonb_typeof(${table.undoData}) = 'object' AND ${table.undoData} ? 'transactions' AND jsonb_typeof(${table.undoData}->'transactions') = 'array'`,
    ),
  ],
);
