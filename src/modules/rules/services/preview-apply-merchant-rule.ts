import { count, desc, sql } from 'drizzle-orm';

import type { Db } from '@/db';
import type { PreviewApplyMerchantRuleInput } from '@/modules/rules/validators';

import { notDeleted } from '@/lib/audit/soft-delete';
import { ensureFound } from '@/lib/form/validation';
import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { categories } from '@/modules/categories/db/schema';
import { payees } from '@/modules/payees/db/schema';
import { buildMatchWhere } from '@/modules/rules/services/match-predicate-sql';
import { transactions } from '@/modules/transactions/db/schema';

const SAMPLE_SIZE = 50;

export type PreviewApplySample = {
  accountName: string;
  amountCents: number;
  categoryName: null | string;
  description: string;
  direction: 'credit' | 'debit' | null;
  id: string;
  payeeName: null | string;
  transactionAt: Date;
};

export type PreviewApplyResult = {
  count: number;
  sample: PreviewApplySample[];
};

export async function previewApplyMerchantRuleService(
  database: Db,
  userId: string,
  data: PreviewApplyMerchantRuleInput,
): Promise<PreviewApplyResult> {
  return database.transaction(async (tx) => {
    // Bound regex backtracking so preview can't stall the connection.
    await tx.execute(sql`set local statement_timeout = '2s'`);

    const rule = await ensureFound(
      tx.query.merchantRules.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.id, data.id), eq(t.userId, userId), notDeleted(t.deletedAt)),
      }),
      'Merchant rule',
    );

    const where = buildMatchWhere(rule.match, userId);

    const [{ matched }] = await tx
      .select({ matched: count() })
      .from(transactions)
      .where(where);

    const sample = await tx
      .select({
        accountName: ledgerAccounts.name,
        amountCents: transactions.amountCents,
        categoryName: categories.name,
        description: transactions.description,
        direction: transactions.direction,
        id: transactions.id,
        payeeName: payees.name,
        transactionAt: transactions.transactionAt,
      })
      .from(transactions)
      .innerJoin(
        ledgerAccounts,
        sql`${ledgerAccounts.id} = ${transactions.accountId}`,
      )
      .leftJoin(categories, sql`${categories.id} = ${transactions.categoryId}`)
      .leftJoin(payees, sql`${payees.id} = ${transactions.payeeId}`)
      .where(where)
      .orderBy(desc(transactions.transactionAt))
      .limit(SAMPLE_SIZE);

    return { count: matched, sample };
  });
}
