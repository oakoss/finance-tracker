import { createServerFn } from '@tanstack/react-start';
import { desc, eq, inArray } from 'drizzle-orm';

import { db } from '@/db';
import { notDeleted } from '@/lib/audit/soft-delete';
import { isExpectedError, toError } from '@/lib/form/validation';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';

export const listTransactions = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = requireUserId(context);

    try {
      const userAccountIds = db
        .select({ id: ledgerAccounts.id })
        .from(ledgerAccounts)
        .where(eq(ledgerAccounts.userId, userId));

      const rows = await db.query.transactions.findMany({
        columns: {
          accountId: true,
          amountCents: true,
          categoryId: true,
          description: true,
          direction: true,
          id: true,
          memo: true,
          payeeId: true,
          pending: true,
          transactionAt: true,
        },
        orderBy: (t) => desc(t.transactionAt),
        where: (t, { and }) =>
          and(inArray(t.accountId, userAccountIds), notDeleted(t.deletedAt)),
        with: {
          account: { columns: { name: true } },
          category: { columns: { name: true, type: true } },
          payee: { columns: { deletedAt: true, name: true } },
          transactionTags: {
            with: {
              tag: { columns: { id: true, name: true } },
            },
          },
        },
      });

      const result = rows.map((row) => ({
        accountId: row.accountId,
        accountName: row.account.name,
        amountCents: row.amountCents,
        categoryId: row.categoryId,
        categoryName: row.category?.name ?? null,
        categoryType: row.category?.type ?? null,
        description: row.description,
        direction: row.direction,
        id: row.id,
        memo: row.memo,
        payeeId: row.payeeId,
        payeeName: row.payee?.deletedAt === null ? row.payee.name : null,
        pending: row.pending,
        tags: row.transactionTags
          .map((tt) => tt.tag)
          .filter((tag) => tag !== null),
        transactionAt: row.transactionAt,
      }));

      log.info({
        action: 'transaction.list',
        outcome: { count: result.length },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      if (isExpectedError(error)) throw error;
      log.error({
        action: 'transaction.list',
        error: toError(error).message,
        outcome: { success: false },
        user: { idHash: hashId(userId) },
      });
      throw createError({
        cause: toError(error),
        fix: 'Refresh the page. If the problem persists, contact support.',
        message: 'Failed to list transactions.',
        status: 500,
      });
    }
  });

export type TransactionListItem = Awaited<
  ReturnType<typeof listTransactions>
>[number];
