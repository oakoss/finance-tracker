import { createServerFn } from '@tanstack/react-start';
import { asc } from 'drizzle-orm';

import { db } from '@/db';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { isExpectedError, toError } from '@/lib/validation';
import { creditCardCatalog } from '@/modules/accounts/db/schema';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';

export const getCreditCardCatalog = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = requireUserId(context);

    try {
      const rows = await db
        .select()
        .from(creditCardCatalog)
        .orderBy(asc(creditCardCatalog.issuer), asc(creditCardCatalog.name));

      log.info({
        action: 'creditCardCatalog.list',
        outcome: { count: rows.length },
        user: { idHash: hashId(userId) },
      });

      return rows;
    } catch (error) {
      if (isExpectedError(error)) throw error;
      log.error({
        action: 'creditCardCatalog.list',
        error: toError(error).message,
        outcome: { success: false },
        user: { idHash: hashId(userId) },
      });
      throw createError({
        cause: toError(error),
        fix: 'Refresh the page. If the problem persists, contact support.',
        message: 'Failed to load credit card catalog.',
        status: 500,
      });
    }
  });
