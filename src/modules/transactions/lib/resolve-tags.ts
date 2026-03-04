import { and, eq, inArray, sql } from 'drizzle-orm';

import type { DbOrTx } from '@/db';

import { notDeleted } from '@/lib/audit/soft-delete';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { tags } from '@/modules/transactions/db/schema';

type ResolveTagsOpts = {
  existingTagIds?: string[] | undefined;
  newTagNames?: string[] | undefined;
  userId: string;
};

export async function resolveTagIds(
  tx: DbOrTx,
  opts: ResolveTagsOpts,
): Promise<string[]> {
  const existingIds = [...new Set(opts.existingTagIds)];

  if (existingIds.length > 0) {
    const owned = await tx
      .select({ id: tags.id })
      .from(tags)
      .where(
        and(
          inArray(tags.id, existingIds),
          eq(tags.userId, opts.userId),
          notDeleted(tags.deletedAt),
        ),
      );

    if (owned.length !== existingIds.length) {
      log.warn({
        action: 'tag.ownershipCheck',
        expected: existingIds.length,
        found: owned.length,
        outcome: { success: false },
        userId: hashId(opts.userId),
      });
      throw createError({
        fix: 'Remove any recently deleted tags and try again.',
        message: 'One or more tags not found.',
        status: 404,
      });
    }
  }

  const allIds = [...existingIds];

  const names = (opts.newTagNames ?? []).map((n) => n.trim()).filter(Boolean);

  if (names.length > 0) {
    const rows = await tx
      .insert(tags)
      .values(
        names.map((name) => ({
          createdById: opts.userId,
          name,
          userId: opts.userId,
        })),
      )
      .onConflictDoUpdate({
        set: { name: sql`excluded.name` },
        target: [tags.userId, tags.name],
        targetWhere: sql`${tags.deletedAt} is null`,
      })
      .returning({ id: tags.id });

    if (rows.length !== names.length) {
      throw createError({
        fix: 'Try again. If the problem persists, contact support.',
        message: `Failed to resolve ${names.length - rows.length} tag(s).`,
        status: 500,
      });
    }

    allIds.push(...rows.map((r) => r.id));
  }

  return [...new Set(allIds)];
}
