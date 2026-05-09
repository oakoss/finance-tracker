import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { listPayeeAliasesService } from '@/modules/payees/services/list-payee-aliases';
import { listPayeeAliasesSchema } from '@/modules/payees/validators';

export const listPayeeAliases = createServerFn({ method: 'GET' })
  .inputValidator(arkValidator(listPayeeAliasesSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const rows = await listPayeeAliasesService(db, userId, data);

      log.info({
        action: 'payee.alias.list',
        outcome: { count: rows.length },
        user: { idHash: hashId(userId) },
      });

      return rows;
    } catch (error) {
      handleServerFnError(error, {
        action: 'payee.alias.list',
        fix: 'Refresh the page. If the problem persists, contact support.',
        message: 'Failed to list payee aliases.',
        userId,
      });
    }
  });

export type PayeeAliasItem = Awaited<
  ReturnType<typeof listPayeeAliases>
>[number];
