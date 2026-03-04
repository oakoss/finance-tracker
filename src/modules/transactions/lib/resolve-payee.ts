import { and, eq, sql } from 'drizzle-orm';

import type { DbOrTx } from '@/db';

import { notDeleted } from '@/lib/audit/soft-delete';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { payees } from '@/modules/transactions/db/schema';

type ResolvePayeeOpts = {
  existingPayeeId?: string | null | undefined;
  newPayeeName?: string | undefined;
  userId: string;
};

export async function resolvePayeeId(
  tx: DbOrTx,
  opts: ResolvePayeeOpts,
): Promise<string | null> {
  if (!opts.newPayeeName) {
    if (!opts.existingPayeeId) return null;

    const [owned] = await tx
      .select({ id: payees.id })
      .from(payees)
      .where(
        and(
          eq(payees.id, opts.existingPayeeId),
          eq(payees.userId, opts.userId),
          notDeleted(payees.deletedAt),
        ),
      );

    if (!owned) {
      log.warn({
        action: 'payee.ownershipCheck',
        outcome: { success: false },
        payeeId: hashId(opts.existingPayeeId),
        userId: hashId(opts.userId),
      });
      throw createError({
        fix: 'Select a valid payee.',
        message: 'Payee not found.',
        status: 404,
      });
    }

    return owned.id;
  }

  const trimmed = opts.newPayeeName.trim();

  const [row] = await tx
    .insert(payees)
    .values({
      createdById: opts.userId,
      name: trimmed,
      normalizedName: trimmed.toLowerCase(),
      userId: opts.userId,
    })
    .onConflictDoUpdate({
      set: { normalizedName: sql`excluded.normalized_name` },
      target: [payees.userId, payees.name],
      targetWhere: sql`${payees.deletedAt} is null`,
    })
    .returning({ id: payees.id });

  if (!row) {
    throw createError({
      fix: 'Try again. If the problem persists, contact support.',
      message: 'Failed to resolve payee.',
      status: 500,
    });
  }

  return row.id;
}
