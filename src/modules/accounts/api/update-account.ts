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
import { updateAccountSchema } from '@/modules/accounts/types';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';

export const updateAccount = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(updateAccountSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await db.transaction(async (tx) => {
        const { id, terms, ...fields } = data;

        const existing = await ensureFound(
          tx.query.ledgerAccounts.findFirst({
            where: (t, { and: a, eq: e }) =>
              a(e(t.id, id), e(t.userId, userId), notDeleted(t.deletedAt)),
          }),
          'Account',
        );

        const [updated] = await tx
          .update(ledgerAccounts)
          .set({
            ...fields,
            openedAt:
              fields.openedAt === undefined
                ? undefined
                : fields.openedAt
                  ? new Date(fields.openedAt)
                  : null,
            updatedById: userId,
          })
          .where(
            and(
              eq(ledgerAccounts.id, id),
              eq(ledgerAccounts.userId, userId),
              notDeleted(ledgerAccounts.deletedAt),
            ),
          )
          .returning();

        if (!updated) {
          throw createError({
            fix: 'Refresh the page. This account may have been deleted.',
            message: 'Account not found.',
            status: 409,
          });
        }

        if (terms) {
          const existingTerms = await tx.query.accountTerms.findFirst({
            where: (t, { eq: e }) => e(t.accountId, id),
          });

          await (existingTerms
            ? tx
                .update(accountTerms)
                .set({ ...terms, updatedById: userId })
                .where(eq(accountTerms.accountId, id))
            : tx.insert(accountTerms).values({
                ...terms,
                accountId: id,
                createdById: userId,
              }));
        }

        await insertAuditLog(tx, {
          action: 'update',
          actorId: userId,
          afterData: updated as unknown as Record<string, unknown>,
          beforeData: existing as unknown as Record<string, unknown>,
          entityId: id,
          tableName: 'ledger_accounts',
        });

        return updated;
      });

      log.info({
        action: 'account.update',
        outcome: { idHash: hashId(result.id) },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      if (isExpectedError(error)) throw error;
      throwIfConstraintViolation(error, 'account.update', hashId(userId));
      log.error({
        action: 'account.update',
        error: toError(error).message,
        outcome: { success: false },
        user: { idHash: hashId(userId) },
        ...pgErrorFields(error),
      });
      throw createError({
        cause: toError(error),
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to update account.',
        status: 500,
      });
    }
  });
