import type { Db } from '@/db';
import type { CreateAccountInput } from '@/modules/accounts/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { createError } from '@/lib/logging/evlog';
import {
  accountBalanceSnapshots,
  accountTerms,
  ledgerAccounts,
} from '@/modules/accounts/db/schema';

export async function createAccountService(
  database: Db,
  userId: string,
  data: CreateAccountInput,
) {
  return database.transaction(async (tx) => {
    const { initialBalanceCents, terms, ...accountData } = data;

    const [account] = await tx
      .insert(ledgerAccounts)
      .values({
        ...accountData,
        createdById: userId,
        openedAt: accountData.openedAt ? new Date(accountData.openedAt) : null,
        userId,
      })
      .returning();

    if (!account) {
      throw createError({
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to create account.',
        status: 500,
      });
    }

    if (terms) {
      await tx
        .insert(accountTerms)
        .values({ ...terms, accountId: account.id, createdById: userId });
    }

    if (initialBalanceCents !== undefined) {
      await tx
        .insert(accountBalanceSnapshots)
        .values({
          accountId: account.id,
          balanceCents: initialBalanceCents,
          createdById: userId,
          recordedAt: new Date(),
          source: 'manual',
        });
    }

    await insertAuditLog(tx, {
      action: 'create',
      actorId: userId,
      afterData: account as unknown as Record<string, unknown>,
      entityId: account.id,
      tableName: 'ledger_accounts',
    });

    return account;
  });
}
