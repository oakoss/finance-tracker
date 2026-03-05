import { and, desc, eq } from 'drizzle-orm';

import type { Db } from '@/db';

import { notDeleted } from '@/lib/audit/soft-delete';
import {
  accountBalanceSnapshots,
  accountTerms,
  ledgerAccounts,
} from '@/modules/accounts/db/schema';

export async function listAccountsService(database: Db, userId: string) {
  const latestBalance = database
    .selectDistinctOn([accountBalanceSnapshots.accountId], {
      accountId: accountBalanceSnapshots.accountId,
      balanceCents: accountBalanceSnapshots.balanceCents,
    })
    .from(accountBalanceSnapshots)
    .orderBy(
      accountBalanceSnapshots.accountId,
      desc(accountBalanceSnapshots.recordedAt),
    )
    .as('latest_balance');

  return database
    .select({
      account: ledgerAccounts,
      latestBalanceCents: latestBalance.balanceCents,
      terms: accountTerms,
    })
    .from(ledgerAccounts)
    .leftJoin(accountTerms, eq(accountTerms.accountId, ledgerAccounts.id))
    .leftJoin(latestBalance, eq(latestBalance.accountId, ledgerAccounts.id))
    .where(
      and(
        eq(ledgerAccounts.userId, userId),
        notDeleted(ledgerAccounts.deletedAt),
      ),
    )
    .orderBy(desc(ledgerAccounts.createdAt));
}
