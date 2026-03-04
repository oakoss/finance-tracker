import { sql } from 'drizzle-orm';

import type { DbOrTx } from '@/db';

import { createError } from '@/lib/logging/evlog';
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
  const allIds = [...(opts.existingTagIds ?? [])];

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
