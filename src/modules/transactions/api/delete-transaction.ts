import { createServerFn } from '@tanstack/react-start';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { pgErrorFields, throwIfConstraintViolation } from '@/lib/db/pg-error';
import {
  arkValidator,
  ensureFound,
  isExpectedError,
  toError,
} from '@/lib/form/validation';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { transactions } from '@/modules/transactions/db/schema';
import { deleteTransactionSchema } from '@/modules/transactions/types';

export const deleteTransaction = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(deleteTransactionSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      await db.transaction(async (tx) => {
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

        const now = new Date();

        const [deleted] = await tx
          .update(transactions)
          .set({
            deletedAt: now,
            deletedById: userId,
          })
          .where(
            and(
              eq(transactions.id, data.id),
              notDeleted(transactions.deletedAt),
            ),
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

      log.info({
        action: 'transaction.delete',
        outcome: { idHash: hashId(data.id) },
        user: { idHash: hashId(userId) },
      });

      return { success: true };
    } catch (error) {
      if (isExpectedError(error)) throw error;
      throwIfConstraintViolation(error, 'transaction.delete', hashId(userId));
      log.error({
        action: 'transaction.delete',
        error: toError(error).message,
        outcome: { success: false },
        user: { idHash: hashId(userId) },
        ...pgErrorFields(error),
      });
      throw createError({
        cause: toError(error),
        fix: 'Try again or contact support.',
        message: 'Failed to delete transaction.',
        status: 500,
      });
    }
  });
