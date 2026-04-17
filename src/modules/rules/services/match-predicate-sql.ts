import { and, between, eq, gte, ilike, lte, type SQL, sql } from 'drizzle-orm';

import type { MatchPredicate } from '@/modules/rules/models';

import { notDeleted } from '@/lib/audit/soft-delete';
import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { transactions } from '@/modules/transactions/db/schema';

export function escapeLike(value: string): string {
  return value
    .replaceAll('\\', String.raw`\\`)
    .replaceAll('%', String.raw`\%`)
    .replaceAll('_', String.raw`\_`);
}

export function buildMatchWhere(
  predicate: MatchPredicate,
  userId: string,
): SQL {
  const userAccountIds = sql`(select ${ledgerAccounts.id} from ${ledgerAccounts} where ${ledgerAccounts.userId} = ${userId})`;

  const clauses: (SQL | undefined)[] = [
    sql`${transactions.accountId} in ${userAccountIds}`,
    notDeleted(transactions.deletedAt),
    descriptionClause(predicate),
    amountClause(predicate),
    directionClause(predicate),
    accountClause(predicate),
  ];

  const combined = and(...clauses);
  if (!combined) {
    throw new Error('buildMatchWhere produced an empty predicate');
  }
  return combined;
}

function descriptionClause(predicate: MatchPredicate): SQL {
  const escaped = escapeLike(predicate.value);
  switch (predicate.kind) {
    case 'contains': {
      return ilike(transactions.description, `%${escaped}%`);
    }
    case 'ends_with': {
      return ilike(transactions.description, `%${escaped}`);
    }
    case 'exact': {
      return ilike(transactions.description, escaped);
    }
    case 'regex': {
      return sql`${transactions.description} ~* ${predicate.value}`;
    }
    case 'starts_with': {
      return ilike(transactions.description, `${escaped}%`);
    }
  }
}

function amountClause(predicate: MatchPredicate): SQL | undefined {
  const { amountMaxCents, amountMinCents, amountOp } = predicate;
  if (!amountOp) return undefined;
  switch (amountOp) {
    case 'between': {
      return between(
        transactions.amountCents,
        amountMinCents!,
        amountMaxCents!,
      );
    }
    case 'eq': {
      const bound = (amountMinCents ?? amountMaxCents)!;
      return eq(transactions.amountCents, bound);
    }
    case 'gte': {
      return gte(transactions.amountCents, amountMinCents!);
    }
    case 'lte': {
      return lte(transactions.amountCents, amountMaxCents!);
    }
  }
}

function directionClause(predicate: MatchPredicate): SQL | undefined {
  if (!predicate.direction || predicate.direction === 'both') return undefined;
  return eq(transactions.direction, predicate.direction);
}

function accountClause(predicate: MatchPredicate): SQL | undefined {
  if (!predicate.accountId) return undefined;
  return eq(transactions.accountId, predicate.accountId);
}
