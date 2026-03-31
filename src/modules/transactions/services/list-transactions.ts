import { desc, eq, inArray } from 'drizzle-orm';

import type { Db } from '@/db';

import { notDeleted } from '@/lib/audit/soft-delete';
import { ledgerAccounts } from '@/modules/accounts/db/schema';

export async function listTransactionsService(database: Db, userId: string) {
  const userAccountIds = database
    .select({ id: ledgerAccounts.id })
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.userId, userId));

  const rows = await database.query.transactions.findMany({
    columns: {
      accountId: true,
      amountCents: true,
      categoryId: true,
      description: true,
      direction: true,
      id: true,
      isSplit: true,
      memo: true,
      payeeId: true,
      pending: true,
      transactionAt: true,
      transferId: true,
    },
    orderBy: (t) => desc(t.transactionAt),
    where: (t, { and }) =>
      and(inArray(t.accountId, userAccountIds), notDeleted(t.deletedAt)),
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
      transactionTags: { with: { tag: { columns: { id: true, name: true } } } },
    },
  });

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
    transferId: row.transferId,
  }));
}
