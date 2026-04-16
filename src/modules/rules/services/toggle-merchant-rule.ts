import { and, eq } from 'drizzle-orm';

import type { Db } from '@/db';
import type { ToggleMerchantRuleInput } from '@/modules/rules/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { ensureFound } from '@/lib/form/validation';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { merchantRules } from '@/modules/rules/db/schema';

export async function toggleMerchantRuleService(
  database: Db,
  userId: string,
  data: ToggleMerchantRuleInput,
) {
  return database.transaction(async (tx) => {
    const existing = await ensureFound(
      tx.query.merchantRules.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(e(t.id, data.id), e(t.userId, userId), notDeleted(t.deletedAt)),
      }),
      'Merchant rule',
    );

    const [updated] = await tx
      .update(merchantRules)
      .set({ isActive: !existing.isActive, updatedById: userId })
      .where(
        and(
          eq(merchantRules.id, data.id),
          eq(merchantRules.userId, userId),
          notDeleted(merchantRules.deletedAt),
        ),
      )
      .returning();

    if (!updated) {
      log.warn({
        action: 'merchantRule.toggle',
        outcome: { reason: 'vanished', success: false },
        user: { idHash: hashId(userId) },
      });
      throw createError({
        fix: 'Refresh the page. This rule may have been deleted.',
        message: 'Merchant rule not found.',
        status: 409,
      });
    }

    await insertAuditLog(tx, {
      action: 'update',
      actorId: userId,
      afterData: updated as unknown as Record<string, unknown>,
      beforeData: existing as unknown as Record<string, unknown>,
      entityId: data.id,
      tableName: 'merchant_rules',
    });

    return updated;
  });
}
