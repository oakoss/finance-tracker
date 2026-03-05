import { and, eq } from 'drizzle-orm';

import type { Db } from '@/db';
import type { DeleteAccountInput } from '@/modules/accounts/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { ensureFound } from '@/lib/form/validation';
import { createError } from '@/lib/logging/evlog';
import { accountTerms, ledgerAccounts } from '@/modules/accounts/db/schema';

export async function deleteAccountService(
  database: Db,
  userId: string,
  data: DeleteAccountInput,
) {
  return database.transaction(async (tx) => {
    const existing = await ensureFound(
      tx.query.ledgerAccounts.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(e(t.id, data.id), e(t.userId, userId), notDeleted(t.deletedAt)),
      }),
      'Account',
    );

    const now = new Date();

    const [deleted] = await tx
      .update(ledgerAccounts)
      .set({
        deletedAt: now,
        deletedById: userId,
      })
      .where(
        and(
          eq(ledgerAccounts.id, data.id),
          eq(ledgerAccounts.userId, userId),
          notDeleted(ledgerAccounts.deletedAt),
        ),
      )
      .returning();

    if (!deleted) {
      throw createError({
        fix: 'Refresh the page. This account may have already been deleted.',
        message: 'Account not found.',
        status: 409,
      });
    }

    await tx
      .update(accountTerms)
      .set({
        deletedAt: now,
        deletedById: userId,
      })
      .where(
        and(
          eq(accountTerms.accountId, data.id),
          notDeleted(accountTerms.deletedAt),
        ),
      );

    await insertAuditLog(tx, {
      action: 'delete',
      actorId: userId,
      beforeData: existing as unknown as Record<string, unknown>,
      entityId: data.id,
      tableName: 'ledger_accounts',
    });
  });
}
