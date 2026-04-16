import { and, desc, eq } from 'drizzle-orm';

import type { Db } from '@/db';
import type { UpdateMerchantRuleInput } from '@/modules/rules/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { ensureFound } from '@/lib/form/validation';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { merchantRules } from '@/modules/rules/db/schema';

export async function updateMerchantRuleService(
  database: Db,
  userId: string,
  data: UpdateMerchantRuleInput,
) {
  return database.transaction(async (tx) => {
    const { id, ...fields } = data;

    const existing = await ensureFound(
      tx.query.merchantRules.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(e(t.id, id), e(t.userId, userId), notDeleted(t.deletedAt)),
      }),
      'Merchant rule',
    );

    // Stage change auto-appends to the end of the destination stage so
    // the composite (stage, priority) key stays unique. Callers do not
    // supply priority directly; reorder owns the ordering contract.
    let priority: number | undefined;
    if (fields.stage !== undefined && fields.stage !== existing.stage) {
      const [tail] = await tx
        .select({ priority: merchantRules.priority })
        .from(merchantRules)
        .where(
          and(
            eq(merchantRules.userId, userId),
            eq(merchantRules.stage, fields.stage),
            notDeleted(merchantRules.deletedAt),
          ),
        )
        .orderBy(desc(merchantRules.priority))
        .limit(1);
      priority = tail ? tail.priority + 1 : 0;
    }

    const [updated] = await tx
      .update(merchantRules)
      .set({
        ...(fields.actions === undefined ? {} : { actions: fields.actions }),
        ...(fields.isActive === undefined ? {} : { isActive: fields.isActive }),
        ...(fields.match === undefined ? {} : { match: fields.match }),
        ...(priority === undefined ? {} : { priority }),
        ...(fields.stage === undefined ? {} : { stage: fields.stage }),
        updatedById: userId,
      })
      .where(
        and(
          eq(merchantRules.id, id),
          eq(merchantRules.userId, userId),
          notDeleted(merchantRules.deletedAt),
        ),
      )
      .returning();

    if (!updated) {
      log.warn({
        action: 'merchantRule.update',
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
      entityId: id,
      tableName: 'merchant_rules',
    });

    return updated;
  });
}
