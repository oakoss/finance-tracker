import { and, eq, or } from 'drizzle-orm';

import type { Db } from '@/db';
import type { DeleteTransactionInput } from '@/modules/transactions/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { ensureFound } from '@/lib/form/validation';
import { createError } from '@/lib/logging/evlog';
import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { transactions } from '@/modules/transactions/db/schema';
import { transfers } from '@/modules/transfers/db/schema';

export async function deleteTransactionService(
  database: Db,
  userId: string,
  data: DeleteTransactionInput,
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

    // Soft-deleting a paired transaction would leave an active transfer
    // row pointing at a deleted leg.
    const [pairedTransfer] = await tx
      .select({ id: transfers.id })
      .from(transfers)
      .where(
        and(
          or(
            eq(transfers.fromTransactionId, data.id),
            eq(transfers.toTransactionId, data.id),
          ),
          notDeleted(transfers.deletedAt),
        ),
      )
      .limit(1);
    if (pairedTransfer) {
      throw createError({
        fix: 'Transfers cannot be deleted. Manual unpair is coming soon.',
        message: 'Cannot delete a paired transfer transaction.',
        status: 422,
      });
    }

    const now = new Date();

    const [deleted] = await tx
      .update(transactions)
      .set({ deletedAt: now, deletedById: userId })
      .where(
        and(eq(transactions.id, data.id), notDeleted(transactions.deletedAt)),
      )
      .returning();

    if (!deleted) {
      throw createError({
        fix: 'Refresh the page. This transaction may have already been deleted.',
        message: 'Transaction not found.',
        status: 409,
      });
    }

    await insertAuditLog(tx, {
      action: 'delete',
      actorId: userId,
      beforeData: existing as unknown as Record<string, unknown>,
      entityId: data.id,
      tableName: 'transactions',
    });
  });
}
