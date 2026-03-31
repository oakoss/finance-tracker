import { and, eq } from 'drizzle-orm';

import type { Db } from '@/db';
import type { UnsplitTransactionInput } from '@/modules/transactions/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { ensureFound } from '@/lib/form/validation';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { splitLines, transactions } from '@/modules/transactions/db/schema';

export async function unsplitTransactionService(
  database: Db,
  userId: string,
  data: UnsplitTransactionInput,
) {
  return database.transaction(async (tx) => {
    const existing = await ensureFound(
      tx
        .select({ transaction: transactions })
        .from(transactions)
        .innerJoin(
          ledgerAccounts,
          eq(ledgerAccounts.id, transactions.accountId),
        )
        .where(
          and(
            eq(transactions.id, data.id),
            eq(ledgerAccounts.userId, userId),
            notDeleted(transactions.deletedAt),
          ),
        )
        .then((rows) => rows[0]?.transaction),
      'Transaction',
    );

    if (!existing.isSplit) {
      throw createError({
        fix: 'This transaction is not split.',
        message: 'Transaction is not split.',
        status: 409,
      });
    }

    const deleted = await tx
      .delete(splitLines)
      .where(eq(splitLines.transactionId, data.id))
      .returning({ id: splitLines.id });

    if (deleted.length === 0) {
      log.warn({
        action: 'transaction.unsplit.noLines',
        outcome: { transactionIdHash: hashId(data.id) },
      });
    }

    // categoryId stays null; user re-assigns after unsplit
    const [updated] = await tx
      .update(transactions)
      .set({ isSplit: false, updatedById: userId })
      .where(
        and(eq(transactions.id, data.id), notDeleted(transactions.deletedAt)),
      )
      .returning();

    if (!updated) {
      throw createError({
        fix: 'Refresh and try again.',
        message: 'Failed to update transaction.',
        status: 409,
      });
    }

    await insertAuditLog(tx, {
      action: 'update',
      actorId: userId,
      afterData: updated as unknown as Record<string, unknown>,
      beforeData: existing as unknown as Record<string, unknown>,
      entityId: data.id,
      tableName: 'transactions',
    });

    return updated;
  });
}
