import { and, eq } from 'drizzle-orm';

import type { Db } from '@/db';
import type { SplitTransactionInput } from '@/modules/transactions/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { ensureFound } from '@/lib/form/validation';
import { createError } from '@/lib/logging/evlog';
import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { splitLines, transactions } from '@/modules/transactions/db/schema';

export async function splitTransactionService(
  database: Db,
  userId: string,
  data: SplitTransactionInput,
) {
  return database.transaction(async (tx) => {
    if (data.lines.length < 2) {
      throw createError({
        fix: 'A split requires at least 2 lines.',
        message: 'Not enough split lines.',
        status: 422,
      });
    }

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

    if (existing.isSplit) {
      throw createError({
        fix: 'Use "Edit splits" to change existing split lines, or unsplit first.',
        message: 'Transaction is already split.',
        status: 409,
      });
    }

    if (existing.transferId) {
      throw createError({
        fix: 'Transfer transactions cannot be split.',
        message: 'Cannot split a transfer.',
        status: 422,
      });
    }

    const lineSum = data.lines.reduce((sum, l) => sum + l.amountCents, 0);
    if (lineSum !== existing.amountCents) {
      throw createError({
        fix: `Split lines must sum to ${existing.amountCents} cents. Current sum: ${lineSum}.`,
        message: 'Split line amounts do not match the transaction total.',
        status: 422,
      });
    }

    const [updated] = await tx
      .update(transactions)
      .set({ categoryId: null, isSplit: true, updatedById: userId })
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

    const inserted = await tx
      .insert(splitLines)
      .values(
        data.lines.map((line, index) => ({
          amountCents: line.amountCents,
          categoryId: line.categoryId ?? null,
          createdById: userId,
          memo: line.memo ?? null,
          sortOrder: index,
          transactionId: data.id,
        })),
      )
      .returning({ id: splitLines.id });

    if (inserted.length !== data.lines.length) {
      throw createError({
        fix: 'Refresh and try again.',
        message: `Expected ${data.lines.length} split lines, created ${inserted.length}.`,
        status: 500,
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
