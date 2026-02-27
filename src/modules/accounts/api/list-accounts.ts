import { createServerFn } from '@tanstack/react-start';
import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { notDeleted } from '@/lib/audit/soft-delete';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { isExpectedError, toError } from '@/lib/validation';
import {
  accountBalanceSnapshots,
  accountTerms,
  ledgerAccounts,
} from '@/modules/accounts/db/schema';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';

export const listAccounts = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = requireUserId(context);

    try {
      const latestBalance = db
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

      const rows = await db
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

      log.info({
        action: 'account.list',
        outcome: { count: rows.length },
        user: { idHash: hashId(userId) },
      });

      return rows;
    } catch (error) {
      if (isExpectedError(error)) throw error;
      log.error({
        action: 'account.list',
        error: toError(error).message,
        outcome: { success: false },
        user: { idHash: hashId(userId) },
      });
      throw createError({
        cause: toError(error),
        fix: 'Refresh the page. If the problem persists, contact support.',
        message: 'Failed to list accounts.',
        status: 500,
      });
    }
  });

export type AccountListItem = Awaited<ReturnType<typeof listAccounts>>[number];
