import { and, eq, inArray } from 'drizzle-orm';

import type { Db } from '@/db';

import { notDeleted } from '@/lib/audit/soft-delete';
import { accountTerms, ledgerAccounts } from '@/modules/accounts/db/schema';
import { budgetLines, budgetPeriods } from '@/modules/budgets/db/schema';
import { categories } from '@/modules/categories/db/schema';
import { debtStrategies, debtStrategyOrder } from '@/modules/debt/db/schema';
import { imports } from '@/modules/imports/db/schema';
import { userPreferences } from '@/modules/preferences/db/schema';
import {
  merchantRules,
  payeeAliases,
  recurringRules,
} from '@/modules/rules/db/schema';
import {
  payees,
  splitLines,
  tags,
  transactions,
  transactionTags,
} from '@/modules/transactions/db/schema';
import { transfers } from '@/modules/transfers/db/schema';

export type UserExportData = Awaited<ReturnType<typeof gatherUserData>>;

export async function gatherUserData(database: Db, userId: string) {
  // First pass: tables with direct userId FK
  const [
    accountsData,
    categoriesData,
    payeesData,
    tagsData,
    budgetPeriodsData,
    preferencesData,
    debtStrategiesData,
    importsData,
    merchantRulesData,
    recurringRulesData,
    transfersData,
  ] = await Promise.all([
    database
      .select()
      .from(ledgerAccounts)
      .where(
        and(
          eq(ledgerAccounts.userId, userId),
          notDeleted(ledgerAccounts.deletedAt),
        ),
      ),
    database
      .select()
      .from(categories)
      .where(
        and(eq(categories.userId, userId), notDeleted(categories.deletedAt)),
      ),
    database
      .select()
      .from(payees)
      .where(and(eq(payees.userId, userId), notDeleted(payees.deletedAt))),
    database
      .select()
      .from(tags)
      .where(and(eq(tags.userId, userId), notDeleted(tags.deletedAt))),
    database
      .select()
      .from(budgetPeriods)
      .where(
        and(
          eq(budgetPeriods.userId, userId),
          notDeleted(budgetPeriods.deletedAt),
        ),
      ),
    database.query.userPreferences.findFirst({
      where: and(
        eq(userPreferences.userId, userId),
        notDeleted(userPreferences.deletedAt),
      ),
    }),
    database
      .select()
      .from(debtStrategies)
      .where(
        and(
          eq(debtStrategies.userId, userId),
          notDeleted(debtStrategies.deletedAt),
        ),
      ),
    database
      .select({
        createdAt: imports.createdAt,
        fileName: imports.fileName,
        id: imports.id,
        status: imports.status,
      })
      .from(imports)
      .where(and(eq(imports.userId, userId), notDeleted(imports.deletedAt))),
    database
      .select()
      .from(merchantRules)
      .where(
        and(
          eq(merchantRules.userId, userId),
          notDeleted(merchantRules.deletedAt),
        ),
      ),
    database
      .select()
      .from(recurringRules)
      .where(
        and(
          eq(recurringRules.userId, userId),
          notDeleted(recurringRules.deletedAt),
        ),
      ),
    database
      .select()
      .from(transfers)
      .where(
        and(eq(transfers.userId, userId), notDeleted(transfers.deletedAt)),
      ),
  ]);

  const accountIds = accountsData.map((a) => a.id);
  const payeeIds = payeesData.map((p) => p.id);
  const strategyIds = debtStrategiesData.map((s) => s.id);
  const periodIds = budgetPeriodsData.map((p) => p.id);

  // Second pass: child tables linked through parent IDs
  const [
    accountTermsData,
    transactionsData,
    splitLinesData,
    budgetLinesData,
    debtStrategyOrderData,
    payeeAliasesData,
    transactionTagsData,
  ] = await Promise.all([
    accountIds.length > 0
      ? database
          .select()
          .from(accountTerms)
          .where(
            and(
              inArray(accountTerms.accountId, accountIds),
              notDeleted(accountTerms.deletedAt),
            ),
          )
      : [],
    accountIds.length > 0
      ? database
          .select()
          .from(transactions)
          .where(
            and(
              inArray(transactions.accountId, accountIds),
              notDeleted(transactions.deletedAt),
            ),
          )
      : [],
    accountIds.length > 0
      ? database
          .select({
            amountCents: splitLines.amountCents,
            categoryId: splitLines.categoryId,
            id: splitLines.id,
            memo: splitLines.memo,
            sortOrder: splitLines.sortOrder,
            transactionId: splitLines.transactionId,
          })
          .from(splitLines)
          .innerJoin(
            transactions,
            eq(splitLines.transactionId, transactions.id),
          )
          .where(
            and(
              inArray(transactions.accountId, accountIds),
              notDeleted(transactions.deletedAt),
              notDeleted(splitLines.deletedAt),
            ),
          )
          .orderBy(splitLines.transactionId, splitLines.sortOrder)
      : [],
    periodIds.length > 0
      ? database
          .select({
            amountCents: budgetLines.amountCents,
            budgetPeriodId: budgetLines.budgetPeriodId,
            categoryId: budgetLines.categoryId,
            id: budgetLines.id,
            notes: budgetLines.notes,
          })
          .from(budgetLines)
          .where(
            and(
              inArray(budgetLines.budgetPeriodId, periodIds),
              notDeleted(budgetLines.deletedAt),
            ),
          )
      : [],
    strategyIds.length > 0
      ? database
          .select({
            accountId: debtStrategyOrder.accountId,
            id: debtStrategyOrder.id,
            rank: debtStrategyOrder.rank,
            strategyId: debtStrategyOrder.strategyId,
          })
          .from(debtStrategyOrder)
          .where(
            and(
              inArray(debtStrategyOrder.strategyId, strategyIds),
              notDeleted(debtStrategyOrder.deletedAt),
            ),
          )
      : [],
    payeeIds.length > 0
      ? database
          .select()
          .from(payeeAliases)
          .where(
            and(
              inArray(payeeAliases.payeeId, payeeIds),
              notDeleted(payeeAliases.deletedAt),
            ),
          )
      : [],
    accountIds.length > 0
      ? database
          .select({
            id: transactionTags.id,
            tagId: transactionTags.tagId,
            transactionId: transactionTags.transactionId,
          })
          .from(transactionTags)
          .innerJoin(
            transactions,
            eq(transactionTags.transactionId, transactions.id),
          )
          .where(
            and(
              inArray(transactions.accountId, accountIds),
              notDeleted(transactions.deletedAt),
              notDeleted(transactionTags.deletedAt),
            ),
          )
      : [],
  ]);

  return {
    accounts: accountsData,
    accountTerms: accountTermsData,
    budgetLines: budgetLinesData,
    budgetPeriods: budgetPeriodsData,
    categories: categoriesData,
    debtStrategies: debtStrategiesData,
    debtStrategyOrder: debtStrategyOrderData,
    imports: importsData,
    merchantRules: merchantRulesData,
    payeeAliases: payeeAliasesData,
    payees: payeesData,
    preferences: preferencesData ?? null,
    recurringRules: recurringRulesData,
    splitLines: splitLinesData,
    tags: tagsData,
    transactions: transactionsData,
    transactionTags: transactionTagsData,
    transfers: transfersData,
  };
}
