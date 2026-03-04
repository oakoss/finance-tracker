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
import {
  payees,
  tags,
  transactions,
  transactionTags,
} from '@/modules/transactions/db/schema';
import { updateTransactionSchema } from '@/modules/transactions/types';

export const updateTransaction = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(updateTransactionSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await db.transaction(async (tx) => {
        const {
          id,
          newPayeeName,
          newTagNames,
          payeeId: inputPayeeId,
          tagIds,
          transactionAt,
          ...fields
        } = data;

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
                eq(transactions.id, id),
                eq(ledgerAccounts.userId, userId),
                notDeleted(transactions.deletedAt),
              ),
            )
            .then((rows) => rows[0]?.transaction),
          'Transaction',
        );

        if (fields.accountId && fields.accountId !== existing.accountId) {
          const account = await tx.query.ledgerAccounts.findFirst({
            where: (t, { and: a, eq: e }) =>
              a(
                e(t.id, fields.accountId!),
                e(t.userId, userId),
                notDeleted(t.deletedAt),
              ),
          });

          if (!account) {
            throw createError({
              fix: 'Select a valid account.',
              message: 'Account not found.',
              status: 404,
            });
          }
        }

        let payeeId = inputPayeeId;
        if (newPayeeName) {
          const normalizedName = newPayeeName.trim().toLowerCase();
          const existingPayee = await tx.query.payees.findFirst({
            where: (t, { and: a, eq: e }) =>
              a(
                e(t.normalizedName, normalizedName),
                e(t.userId, userId),
                notDeleted(t.deletedAt),
              ),
          });

          if (existingPayee) {
            payeeId = existingPayee.id;
          } else {
            const [newPayee] = await tx
              .insert(payees)
              .values({
                createdById: userId,
                name: newPayeeName.trim(),
                normalizedName,
                userId,
              })
              .returning();

            if (!newPayee) {
              throw createError({
                fix: 'Try again. If the problem persists, contact support.',
                message: 'Failed to create payee.',
                status: 500,
              });
            }

            payeeId = newPayee.id;
          }
        }

        const transactionDate = transactionAt
          ? new Date(transactionAt)
          : undefined;

        const [updated] = await tx
          .update(transactions)
          .set({
            ...fields,
            payeeId,
            postedAt: transactionDate,
            transactionAt: transactionDate,
            updatedById: userId,
          })
          .where(
            and(eq(transactions.id, id), notDeleted(transactions.deletedAt)),
          )
          .returning();

        if (!updated) {
          throw createError({
            fix: 'Refresh the page. This transaction may have been deleted.',
            message: 'Transaction not found.',
            status: 409,
          });
        }

        if (tagIds !== undefined || newTagNames !== undefined) {
          await tx
            .delete(transactionTags)
            .where(eq(transactionTags.transactionId, id));

          const allTagIds = [...(tagIds ?? [])];

          if (newTagNames?.length) {
            for (const tagName of newTagNames) {
              const trimmed = tagName.trim();
              if (!trimmed) continue;

              const existingTag = await tx.query.tags.findFirst({
                where: (t, { and: a, eq: e }) =>
                  a(
                    e(t.name, trimmed),
                    e(t.userId, userId),
                    notDeleted(t.deletedAt),
                  ),
              });

              if (existingTag) {
                allTagIds.push(existingTag.id);
              } else {
                const [newTag] = await tx
                  .insert(tags)
                  .values({
                    createdById: userId,
                    name: trimmed,
                    userId,
                  })
                  .returning();

                if (!newTag) {
                  throw createError({
                    fix: 'Try again. If the problem persists, contact support.',
                    message: 'Failed to create tag.',
                    status: 500,
                  });
                }

                allTagIds.push(newTag.id);
              }
            }
          }

          if (allTagIds.length > 0) {
            const uniqueTagIds = [...new Set(allTagIds)];
            await tx.insert(transactionTags).values(
              uniqueTagIds.map((tagId) => ({
                createdById: userId,
                tagId,
                transactionId: id,
              })),
            );
          }
        }

        await insertAuditLog(tx, {
          action: 'update',
          actorId: userId,
          afterData: updated as unknown as Record<string, unknown>,
          beforeData: existing as unknown as Record<string, unknown>,
          entityId: id,
          tableName: 'transactions',
        });

        return updated;
      });

      log.info({
        action: 'transaction.update',
        outcome: { idHash: hashId(result.id) },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      if (isExpectedError(error)) throw error;
      throwIfConstraintViolation(error, 'transaction.update', hashId(userId));
      log.error({
        action: 'transaction.update',
        error: toError(error).message,
        outcome: { success: false },
        user: { idHash: hashId(userId) },
        ...pgErrorFields(error),
      });
      throw createError({
        cause: toError(error),
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to update transaction.',
        status: 500,
      });
    }
  });
