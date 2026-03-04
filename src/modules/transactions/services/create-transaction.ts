import type { Db } from '@/db';
import type { CreateTransactionInput } from '@/modules/transactions/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import {
  transactions,
  transactionTags,
} from '@/modules/transactions/db/schema';
import { resolvePayeeId } from '@/modules/transactions/lib/resolve-payee';
import { resolveTagIds } from '@/modules/transactions/lib/resolve-tags';

export async function createTransactionService(
  database: Db,
  userId: string,
  data: CreateTransactionInput,
) {
  return database.transaction(async (tx) => {
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

    if (data.categoryId) {
      const category = await tx.query.categories.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(
            e(t.id, data.categoryId!),
            e(t.userId, userId),
            notDeleted(t.deletedAt),
          ),
      });

      if (!category) {
        log.warn({
          action: 'category.ownershipCheck',
          categoryId: hashId(data.categoryId),
          outcome: { success: false },
          userId: hashId(userId),
        });
        throw createError({
          fix: 'Select a valid category.',
          message: 'Category not found.',
          status: 404,
        });
      }
    }

    const payeeId = await resolvePayeeId(tx, {
      existingPayeeId: data.payeeId,
      newPayeeName: data.newPayeeName,
      userId,
    });

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

    const allTagIds = await resolveTagIds(tx, {
      existingTagIds: data.tagIds,
      newTagNames: data.newTagNames,
      userId,
    });

    if (allTagIds.length > 0) {
      await tx.insert(transactionTags).values(
        allTagIds.map((tagId) => ({
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
}
