import { and, desc, eq, inArray } from 'drizzle-orm';

import type { Db } from '@/db';

import { notDeleted } from '@/lib/audit/soft-delete';
import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { transfers } from '@/modules/transfers/db/schema';

export async function listTransactionsService(database: Db, userId: string) {
  const userAccountIds = database
    .select({ id: ledgerAccounts.id })
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.userId, userId));

  const [rows, transferRows] = await Promise.all([
    database.query.transactions.findMany({
      columns: {
        accountId: true,
        amountCents: true,
        categoryId: true,
        description: true,
        direction: true,
        id: true,
        isSplit: true,
        matchedRuleIds: true,
        memo: true,
        payeeId: true,
        pending: true,
        transactionAt: true,
      },
      orderBy: (t) => desc(t.transactionAt),
      where: (t, { and: a }) =>
        a(inArray(t.accountId, userAccountIds), notDeleted(t.deletedAt)),
      with: {
        account: { columns: { name: true } },
        category: { columns: { name: true, type: true } },
        payee: { columns: { deletedAt: true, name: true } },
        splitLines: {
          columns: {
            amountCents: true,
            categoryId: true,
            id: true,
            memo: true,
            sortOrder: true,
          },
          orderBy: (sl, { asc }) => asc(sl.sortOrder),
          with: { category: { columns: { name: true } } },
        },
        transactionTags: {
          with: { tag: { columns: { id: true, name: true } } },
        },
      },
    }),
    // `isTransfer` gates Split/Delete in row-actions; falling back to
    // false on failure would expose actions the server rejects with 422.
    // Let the failure propagate so the list breaks instead.
    database
      .select({
        fromTransactionId: transfers.fromTransactionId,
        toTransactionId: transfers.toTransactionId,
      })
      .from(transfers)
      .where(
        and(eq(transfers.userId, userId), notDeleted(transfers.deletedAt)),
      ),
  ]);

  const transferTxnIds = new Set<string>();
  for (const t of transferRows) {
    transferTxnIds.add(t.fromTransactionId);
    transferTxnIds.add(t.toTransactionId);
  }

  return rows.map((row) => ({
    accountId: row.accountId,
    accountName: row.account.name,
    amountCents: row.amountCents,
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? null,
    categoryType: row.category?.type ?? null,
    description: row.description,
    direction: row.direction,
    id: row.id,
    isSplit: row.isSplit,
    isTransfer: transferTxnIds.has(row.id),
    matchedRuleIds: row.matchedRuleIds,
    memo: row.memo,
    payeeId: row.payeeId,
    payeeName: row.payee?.deletedAt === null ? row.payee.name : null,
    pending: row.pending,
    splitLines: row.splitLines.map((sl) => ({
      amountCents: sl.amountCents,
      categoryId: sl.categoryId,
      categoryName: sl.category?.name ?? null,
      id: sl.id,
      memo: sl.memo,
      sortOrder: sl.sortOrder,
    })),
    tags: row.transactionTags.map((tt) => tt.tag).filter((tag) => tag !== null),
    transactionAt: row.transactionAt,
  }));
}
