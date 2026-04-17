import { count, desc, sql } from 'drizzle-orm';

import type { Db } from '@/db';
import type { PreviewApplySample } from '@/modules/rules/services/preview-apply-merchant-rule';
import type { PreviewMatchMerchantRuleInput } from '@/modules/rules/validators';

import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { categories } from '@/modules/categories/db/schema';
import { payees } from '@/modules/payees/db/schema';
import { buildMatchWhere } from '@/modules/rules/services/match-predicate-sql';
import { transactions } from '@/modules/transactions/db/schema';

const SAMPLE_SIZE = 20;

export type PreviewMatchResult = {
  count: number;
  sample: PreviewApplySample[];
};

export async function previewMatchMerchantRuleService(
  database: Db,
  userId: string,
  data: PreviewMatchMerchantRuleInput,
): Promise<PreviewMatchResult> {
  return database.transaction(async (tx) => {
    await tx.execute(sql`set local statement_timeout = '2s'`);

    const where = buildMatchWhere(data, userId);

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
