import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { auditFields } from '@/db/shared';
import { users } from '@/modules/auth/db/schema';
import { merchantRules } from '@/modules/rules/db/schema';
import { transactions } from '@/modules/transactions/db/schema';

export const transferConfidenceEnum = pgEnum('transfer_confidence', [
  'manual',
  'high',
  'medium',
  'low',
]);

export const transfersIndexNames = {
  fromTransactionIdx: 'transfers_from_transaction_id_idx',
  pairUniqueIdx: 'transfers_pair_unique_idx',
  toTransactionIdx: 'transfers_to_transaction_id_idx',
  userIdIdx: 'transfers_user_id_idx',
} as const;

export const transferDismissalsIndexNames = {
  uniquePairIdx: 'transfer_dismissals_user_pair_unique_idx',
  userIdIdx: 'transfer_dismissals_user_id_idx',
} as const;

export const transfersCheckNames = {
  dismissalsOrderedPair: 'transfer_dismissals_ordered_pair_check',
  pairDistinct: 'transfers_pair_distinct_check',
} as const;

// User-facing copy keyed by every constraint that can surface a 23505
// or 23514. The Record narrows the keyspace to violation-prone names —
// adding a new unique index or CHECK without copy fails to typecheck.
// The `userIdIdx` entries on both constants are excluded deliberately:
// plain `index()` (not `uniqueIndex()`) can never raise 23505/23514,
// so they have no copy.
type TransfersConstraintName =
  | typeof transferDismissalsIndexNames.uniquePairIdx
  | typeof transfersCheckNames.dismissalsOrderedPair
  | typeof transfersCheckNames.pairDistinct
  | typeof transfersIndexNames.fromTransactionIdx
  | typeof transfersIndexNames.pairUniqueIdx
  | typeof transfersIndexNames.toTransactionIdx;

export const transfersConstraintMessages: Record<
  TransfersConstraintName,
  string
> = {
  [transferDismissalsIndexNames.uniquePairIdx]:
    'This transaction pair has already been dismissed.',
  [transfersCheckNames.dismissalsOrderedPair]:
    'Dismissed transaction pair must be stored in canonical order.',
  [transfersCheckNames.pairDistinct]:
    'A transfer cannot pair a transaction with itself.',
  [transfersIndexNames.fromTransactionIdx]:
    'This transaction is already part of an active transfer.',
  [transfersIndexNames.pairUniqueIdx]:
    'These transactions are already paired as a transfer.',
  [transfersIndexNames.toTransactionIdx]:
    'This transaction is already part of an active transfer.',
};

export const transfers = pgTable(
  'transfers',
  {
    confidence: transferConfidenceEnum().notNull().default('manual'),
    detectedByRuleId: uuid().references(() => merchantRules.id, {
      onDelete: 'set null',
    }),
    fromTransactionId: uuid()
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    toTransactionId: uuid()
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...auditFields,
  },
  (table) => [
    index(transfersIndexNames.userIdIdx).on(table.userId),
    // Partial unique — a transaction can appear on at most one active
    // transfer's `from` (or `to`) side. Soft-deleted rows don't block
    // re-pairing. Cross-column duplicates (same txn as `from` of one
    // row and `to` of another) are enforced in app code by the
    // manual-pair and auto-detect write paths, not here.
    uniqueIndex(transfersIndexNames.fromTransactionIdx)
      .on(table.fromTransactionId)
      .where(sql`${table.deletedAt} is null`),
    uniqueIndex(transfersIndexNames.toTransactionIdx)
      .on(table.toTransactionId)
      .where(sql`${table.deletedAt} is null`),
    // Order-independent pair uniqueness: (A,B) and (B,A) collapse to
    // the same index entry.
    uniqueIndex(transfersIndexNames.pairUniqueIdx)
      .on(
        sql`LEAST(${table.fromTransactionId}, ${table.toTransactionId})`,
        sql`GREATEST(${table.fromTransactionId}, ${table.toTransactionId})`,
      )
      .where(sql`${table.deletedAt} is null`),
    check(
      transfersCheckNames.pairDistinct,
      sql`${table.fromTransactionId} <> ${table.toTransactionId}`,
    ),
  ],
);

export const transferDismissals = pgTable(
  'transfer_dismissals',
  {
    dismissedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    txnAId: uuid()
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    txnBId: uuid()
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...auditFields,
  },
  (table) => [
    index(transferDismissalsIndexNames.userIdIdx).on(table.userId),
    uniqueIndex(transferDismissalsIndexNames.uniquePairIdx)
      .on(table.userId, table.txnAId, table.txnBId)
      .where(sql`${table.deletedAt} is null`),
    // Callers must store the pair ordered. Closes the loophole if a
    // future seed/import bypasses the helper.
    check(
      transfersCheckNames.dismissalsOrderedPair,
      sql`${table.txnAId} < ${table.txnBId}`,
    ),
  ],
);
