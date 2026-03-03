import { createServerFn } from '@tanstack/react-start';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { pgErrorFields, throwIfConstraintViolation } from '@/lib/db/pg-error';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import {
  arkValidator,
  ensureFound,
  isExpectedError,
  toError,
} from '@/lib/validation';
import { accountTerms, ledgerAccounts } from '@/modules/accounts/db/schema';
import { deleteAccountSchema } from '@/modules/accounts/types';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';

export const deleteAccount = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(deleteAccountSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      await db.transaction(async (tx) => {
        const existing = await ensureFound(
          tx.query.ledgerAccounts.findFirst({
            where: (t, { and: a, eq: e }) =>
              a(e(t.id, data.id), e(t.userId, userId), notDeleted(t.deletedAt)),
          }),
          'Account',
        );

        const now = new Date();

        await tx
          .update(ledgerAccounts)
          .set({
            deletedAt: now,
            deletedById: userId,
          })
          .where(
            and(
              eq(ledgerAccounts.id, data.id),
              eq(ledgerAccounts.userId, userId),
              notDeleted(ledgerAccounts.deletedAt),
            ),
          );

        await tx
          .update(accountTerms)
          .set({
            deletedAt: now,
            deletedById: userId,
          })
          .where(
            and(
              eq(accountTerms.accountId, data.id),
              notDeleted(accountTerms.deletedAt),
            ),
          );

        await insertAuditLog(tx, {
          action: 'delete',
          actorId: userId,
          beforeData: existing as unknown as Record<string, unknown>,
          entityId: data.id,
          tableName: 'ledger_accounts',
        });
      });

      log.info({
        action: 'account.delete',
        outcome: { idHash: hashId(data.id) },
        user: { idHash: hashId(userId) },
      });

      return { success: true };
    } catch (error) {
      if (isExpectedError(error)) throw error;
      throwIfConstraintViolation(error, 'account.delete', hashId(userId));
      log.error({
        action: 'account.delete',
        error: toError(error).message,
        outcome: { success: false },
        user: { idHash: hashId(userId) },
        ...pgErrorFields(error),
      });
      throw createError({
        cause: toError(error),
        fix: 'Try again or contact support.',
        message: 'Failed to delete account.',
        status: 500,
      });
    }
  });
