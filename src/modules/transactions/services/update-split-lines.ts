import { and, eq } from 'drizzle-orm';

import type { Db } from '@/db';
import type { UpdateSplitLinesInput } from '@/modules/transactions/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { ensureFound } from '@/lib/form/validation';
import { createError } from '@/lib/logging/evlog';
import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { splitLines, transactions } from '@/modules/transactions/db/schema';

export async function updateSplitLinesService(
  database: Db,
  userId: string,
  data: UpdateSplitLinesInput,
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

    if (!existing.isSplit) {
      throw createError({
        fix: 'Split the transaction first before editing split lines.',
        message: 'Transaction is not split.',
        status: 409,
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

    await tx.delete(splitLines).where(eq(splitLines.transactionId, data.id));

    await tx
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
      );

    await insertAuditLog(tx, {
      action: 'update',
      actorId: userId,
      afterData: { lines: data.lines } as unknown as Record<string, unknown>,
      beforeData: existing as unknown as Record<string, unknown>,
      entityId: data.id,
      tableName: 'transactions',
    });

    return existing;
  });
}
