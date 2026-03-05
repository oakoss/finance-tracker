import { createServerFn } from '@tanstack/react-start';
import { asc } from 'drizzle-orm';

import { db } from '@/db';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
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
      handleServerFnError(error, {
        action: 'creditCardCatalog.list',
        fix: 'Refresh the page. If the problem persists, contact support.',
        message: 'Failed to load credit card catalog.',
        userId,
      });
    }
  });
