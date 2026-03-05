import { and, eq } from 'drizzle-orm';

import type { Db } from '@/db';
import type { UpdateAccountInput } from '@/modules/accounts/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { ensureFound } from '@/lib/form/validation';
import { createError } from '@/lib/logging/evlog';
import { accountTerms, ledgerAccounts } from '@/modules/accounts/db/schema';

function parseOptionalDate(
  value: string | null | undefined,
): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value) : null;
}

export async function updateAccountService(
  database: Db,
  userId: string,
  data: UpdateAccountInput,
) {
  return database.transaction(async (tx) => {
    const { id, terms, ...fields } = data;

    const existing = await ensureFound(
      tx.query.ledgerAccounts.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(e(t.id, id), e(t.userId, userId), notDeleted(t.deletedAt)),
      }),
      'Account',
    );

    const [updated] = await tx
      .update(ledgerAccounts)
      .set({
        ...fields,
        openedAt: parseOptionalDate(fields.openedAt),
        updatedById: userId,
      })
      .where(
        and(
          eq(ledgerAccounts.id, id),
          eq(ledgerAccounts.userId, userId),
          notDeleted(ledgerAccounts.deletedAt),
        ),
      )
      .returning();

    if (!updated) {
      throw createError({
        fix: 'Refresh the page. This account may have been deleted.',
        message: 'Account not found.',
        status: 409,
      });
    }

    if (terms) {
      const existingTerms = await tx.query.accountTerms.findFirst({
        where: (t, { eq: e }) => e(t.accountId, id),
      });

      await (existingTerms
        ? tx
            .update(accountTerms)
            .set({ ...terms, updatedById: userId })
            .where(eq(accountTerms.accountId, id))
        : tx.insert(accountTerms).values({
            ...terms,
            accountId: id,
            createdById: userId,
          }));
    }

    await insertAuditLog(tx, {
      action: 'update',
      actorId: userId,
      afterData: updated as unknown as Record<string, unknown>,
      beforeData: existing as unknown as Record<string, unknown>,
      entityId: id,
      tableName: 'ledger_accounts',
    });

    return updated;
  });
}
