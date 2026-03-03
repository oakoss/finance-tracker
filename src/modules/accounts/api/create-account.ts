import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { pgErrorFields, throwIfConstraintViolation } from '@/lib/db/pg-error';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { arkValidator, isExpectedError, toError } from '@/lib/validation';
import {
  accountBalanceSnapshots,
  accountTerms,
  ledgerAccounts,
} from '@/modules/accounts/db/schema';
import { createAccountSchema } from '@/modules/accounts/types';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';

export const createAccount = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(createAccountSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await db.transaction(async (tx) => {
        const { initialBalanceCents, terms, ...accountData } = data;

        const [account] = await tx
          .insert(ledgerAccounts)
          .values({
            ...accountData,
            createdById: userId,
            openedAt: accountData.openedAt
              ? new Date(accountData.openedAt)
              : null,
            userId,
          })
          .returning();

        if (!account) {
          throw createError({
            fix: 'Try again. If the problem persists, contact support.',
            message: 'Failed to create account.',
            status: 500,
          });
        }

        if (terms) {
          await tx.insert(accountTerms).values({
            ...terms,
            accountId: account.id,
            createdById: userId,
          });
        }

        if (initialBalanceCents !== undefined) {
          await tx.insert(accountBalanceSnapshots).values({
            accountId: account.id,
            balanceCents: initialBalanceCents,
            createdById: userId,
            recordedAt: new Date(),
            source: 'manual',
          });
        }

        await insertAuditLog(tx, {
          action: 'create',
          actorId: userId,
          afterData: account as unknown as Record<string, unknown>,
          entityId: account.id,
          tableName: 'ledger_accounts',
        });

        return account;
      });

      log.info({
        action: 'account.create',
        outcome: { idHash: hashId(result.id) },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      if (isExpectedError(error)) throw error;
      throwIfConstraintViolation(error, 'account.create', hashId(userId));
      log.error({
        action: 'account.create',
        error: toError(error).message,
        outcome: { success: false },
        user: { idHash: hashId(userId) },
        ...pgErrorFields(error),
      });
      throw createError({
        cause: toError(error),
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to create account.',
        status: 500,
      });
    }
  });
