import { and, eq } from 'drizzle-orm';

import type { Db } from '@/db';
import type { UpdateTransactionInput } from '@/modules/transactions/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { ensureFound } from '@/lib/form/validation';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { ledgerAccounts } from '@/modules/accounts/db/schema';
import {
  transactions,
  transactionTags,
} from '@/modules/transactions/db/schema';
import { resolvePayeeId } from '@/modules/transactions/lib/resolve-payee';
import { resolveTagIds } from '@/modules/transactions/lib/resolve-tags';

export async function updateTransactionService(
  database: Db,
  userId: string,
  data: UpdateTransactionInput,
) {
  return database.transaction(async (tx) => {
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

    if (fields.categoryId) {
      const category = await tx.query.categories.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(
            e(t.id, fields.categoryId!),
            e(t.userId, userId),
            notDeleted(t.deletedAt),
          ),
      });

      if (!category) {
        log.warn({
          action: 'category.ownershipCheck',
          categoryId: hashId(fields.categoryId),
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

    const payeeId = await resolvePayeeId(tx, {
      existingPayeeId: inputPayeeId,
      newPayeeName,
      userId,
    });

    const transactionDate = transactionAt ? new Date(transactionAt) : undefined;

    const [updated] = await tx
      .update(transactions)
      .set({
        ...fields,
        payeeId,
        postedAt: transactionDate,
        transactionAt: transactionDate,
        updatedById: userId,
      })
      .where(and(eq(transactions.id, id), notDeleted(transactions.deletedAt)))
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

      const allTagIds = await resolveTagIds(tx, {
        existingTagIds: tagIds,
        newTagNames,
        userId,
      });

      if (allTagIds.length > 0) {
        await tx
          .insert(transactionTags)
          .values(
            allTagIds.map((tagId) => ({
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
}
