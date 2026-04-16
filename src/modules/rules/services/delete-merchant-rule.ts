import { and, eq } from 'drizzle-orm';

import type { Db } from '@/db';
import type { DeleteMerchantRuleInput } from '@/modules/rules/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { ensureFound } from '@/lib/form/validation';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { merchantRules } from '@/modules/rules/db/schema';

export async function deleteMerchantRuleService(
  database: Db,
  userId: string,
  data: DeleteMerchantRuleInput,
) {
  return database.transaction(async (tx) => {
    const existing = await ensureFound(
      tx.query.merchantRules.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(e(t.id, data.id), e(t.userId, userId), notDeleted(t.deletedAt)),
      }),
      'Merchant rule',
    );

    const now = new Date();

    const [deleted] = await tx
      .update(merchantRules)
      .set({ deletedAt: now, deletedById: userId })
      .where(
        and(
          eq(merchantRules.id, data.id),
          eq(merchantRules.userId, userId),
          notDeleted(merchantRules.deletedAt),
        ),
      )
      .returning();

    if (!deleted) {
      log.warn({
        action: 'merchantRule.delete',
        outcome: { reason: 'vanished', success: false },
        user: { idHash: hashId(userId) },
      });
      throw createError({
        fix: 'Refresh the page. This rule may have already been deleted.',
        message: 'Merchant rule not found.',
        status: 409,
      });
    }

    await insertAuditLog(tx, {
      action: 'delete',
      actorId: userId,
      beforeData: existing as unknown as Record<string, unknown>,
      entityId: data.id,
      tableName: 'merchant_rules',
    });
  });
}
