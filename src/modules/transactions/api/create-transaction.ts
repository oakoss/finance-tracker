import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { arkValidator, isExpectedError, toError } from '@/lib/validation';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import {
  payees,
  tags,
  transactions,
  transactionTags,
} from '@/modules/transactions/db/schema';
import { createTransactionSchema } from '@/modules/transactions/types';

export const createTransaction = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(createTransactionSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await db.transaction(async (tx) => {
        const account = await tx.query.ledgerAccounts.findFirst({
          where: (t, { and: a, eq: e }) =>
            a(
              e(t.id, data.accountId),
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

        let payeeId = data.payeeId ?? null;
        if (data.newPayeeName) {
          const normalizedName = data.newPayeeName.trim().toLowerCase();

          const existing = await tx.query.payees.findFirst({
            where: (t, { and: a, eq: e }) =>
              a(
                e(t.normalizedName, normalizedName),
                e(t.userId, userId),
                notDeleted(t.deletedAt),
              ),
          });

          if (existing) {
            payeeId = existing.id;
          } else {
            const [newPayee] = await tx
              .insert(payees)
              .values({
                createdById: userId,
                name: data.newPayeeName.trim(),
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

        const transactionAt = new Date(data.transactionAt);

        const [transaction] = await tx
          .insert(transactions)
          .values({
            accountId: data.accountId,
            amountCents: data.amountCents,
            categoryId: data.categoryId ?? null,
            createdById: userId,
            description: data.description,
            direction: data.direction ?? 'debit',
            memo: data.memo ?? null,
            payeeId,
            pending: data.pending ?? false,
            postedAt: transactionAt,
            transactionAt,
          })
          .returning();

        if (!transaction) {
          throw createError({
            fix: 'Try again. If the problem persists, contact support.',
            message: 'Failed to create transaction.',
            status: 500,
          });
        }

        const allTagIds = [...(data.tagIds ?? [])];
        if (data.newTagNames?.length) {
          for (const tagName of data.newTagNames) {
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
              transactionId: transaction.id,
            })),
          );
        }

        await insertAuditLog(tx, {
          action: 'create',
          actorId: userId,
          afterData: transaction as unknown as Record<string, unknown>,
          entityId: transaction.id,
          tableName: 'transactions',
        });

        return transaction;
      });

      log.info({
        action: 'transaction.create',
        outcome: { idHash: hashId(result.id) },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      if (isExpectedError(error)) throw error;
      log.error({
        action: 'transaction.create',
        error: toError(error).message,
        outcome: { success: false },
        user: { idHash: hashId(userId) },
      });
      throw createError({
        cause: toError(error),
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to create transaction.',
        status: 500,
      });
    }
  });
