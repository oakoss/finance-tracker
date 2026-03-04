import { sql } from 'drizzle-orm';

import type { DbOrTx } from '@/db';

import { createError } from '@/lib/logging/evlog';
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
    return opts.existingPayeeId ?? null;
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
