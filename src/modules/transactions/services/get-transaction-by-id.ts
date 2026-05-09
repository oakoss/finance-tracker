import { and, eq } from 'drizzle-orm';

import type { Db } from '@/db';

import { notDeleted } from '@/lib/audit/soft-delete';
import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { transactions } from '@/modules/transactions/db/schema';

export type TransactionSeed = {
  categoryId: null | string;
  description: string;
  id: string;
  payeeId: null | string;
};

export async function getTransactionByIdService(
  database: Db,
  userId: string,
  id: string,
): Promise<null | TransactionSeed> {
  const [row] = await database
    .select({
      categoryId: transactions.categoryId,
      description: transactions.description,
      id: transactions.id,
      payeeId: transactions.payeeId,
    })
    .from(transactions)
    .innerJoin(ledgerAccounts, eq(ledgerAccounts.id, transactions.accountId))
    .where(
      and(
        eq(transactions.id, id),
        eq(ledgerAccounts.userId, userId),
        notDeleted(transactions.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}
