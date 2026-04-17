import { PgDialect } from 'drizzle-orm/pg-core';
import { expect } from 'vitest';

import type { MatchPredicate } from '@/modules/rules/models';

import {
  buildMatchWhere,
  escapeLike,
} from '@/modules/rules/services/match-predicate-sql';

const dialect = new PgDialect({ casing: 'snake_case' });

function compile(predicate: MatchPredicate, userId = 'user-1') {
  return dialect.sqlToQuery(buildMatchWhere(predicate, userId));
}

describe('escapeLike', () => {
  it('escapes Postgres ILIKE wildcards and backslashes', () => {
    expect(escapeLike('100%')).toBe(String.raw`100\%`);
    expect(escapeLike('a_b')).toBe(String.raw`a\_b`);
    expect(escapeLike(String.raw`path\to`)).toBe(String.raw`path\\to`);
    expect(escapeLike(String.raw`mix%_\of`)).toBe(String.raw`mix\%\_\\of`);
  });

  it('leaves non-special characters unchanged', () => {
    expect(escapeLike('amazon')).toBe('amazon');
    expect(escapeLike('')).toBe('');
  });
});

describe('buildMatchWhere — description clauses', () => {
  it('contains emits ilike with leading and trailing wildcards', () => {
    const { params, sql } = compile({ kind: 'contains', value: 'amazon' });
    expect(sql).toContain('ilike');
    expect(params).toContain('%amazon%');
  });

  it('starts_with emits ilike with trailing wildcard only', () => {
    const { params } = compile({ kind: 'starts_with', value: 'amzn' });
    expect(params).toContain('amzn%');
    expect(params).not.toContain('%amzn%');
  });

  it('ends_with emits ilike with leading wildcard only', () => {
    const { params } = compile({ kind: 'ends_with', value: 'payment' });
    expect(params).toContain('%payment');
  });

  it('exact emits ilike without wildcards', () => {
    const { params } = compile({ kind: 'exact', value: 'STARBUCKS' });
    expect(params).toContain('STARBUCKS');
  });

  it('regex emits ~* operator (case-insensitive)', () => {
    const { params, sql } = compile({ kind: 'regex', value: '^AMZN' });
    expect(sql).toContain('~*');
    expect(params).toContain('^AMZN');
  });

  it('escapes ILIKE wildcards in user-supplied value', () => {
    const { params } = compile({ kind: 'contains', value: '50% off_sale' });
    expect(params).toContain(String.raw`%50\% off\_sale%`);
  });
});

describe('buildMatchWhere — amount clauses', () => {
  it('between compiles to SQL between with both bounds', () => {
    const { params, sql } = compile({
      amountMaxCents: 500,
      amountMinCents: 100,
      amountOp: 'between',
      kind: 'contains',
      value: 'x',
    });
    expect(sql.toLowerCase()).toContain('between');
    expect(params).toContain(100);
    expect(params).toContain(500);
  });

  it('gte uses only amountMinCents', () => {
    const { params, sql } = compile({
      amountMinCents: 250,
      amountOp: 'gte',
      kind: 'contains',
      value: 'x',
    });
    expect(sql).toContain('>=');
    expect(params).toContain(250);
  });

  it('lte uses only amountMaxCents', () => {
    const { params, sql } = compile({
      amountMaxCents: 900,
      amountOp: 'lte',
      kind: 'contains',
      value: 'x',
    });
    expect(sql).toContain('<=');
    expect(params).toContain(900);
  });

  it('eq with only amountMinCents compiles to equality on that bound', () => {
    const { params, sql } = compile({
      amountMinCents: 1000,
      amountOp: 'eq',
      kind: 'contains',
      value: 'x',
    });
    expect(sql).toContain('=');
    expect(params).toContain(1000);
  });

  it('eq with only amountMaxCents compiles to equality on that bound', () => {
    const { params } = compile({
      amountMaxCents: 750,
      amountOp: 'eq',
      kind: 'contains',
      value: 'x',
    });
    expect(params).toContain(750);
  });

  it('omits amount clause when amountOp is not set', () => {
    const { params } = compile({ kind: 'contains', value: 'x' });
    expect(params).not.toContain(100);
    expect(params).not.toContain(500);
  });
});

describe('buildMatchWhere — direction clause', () => {
  it('emits equality for debit', () => {
    const { params } = compile({
      direction: 'debit',
      kind: 'contains',
      value: 'x',
    });
    expect(params).toContain('debit');
  });

  it('emits equality for credit', () => {
    const { params } = compile({
      direction: 'credit',
      kind: 'contains',
      value: 'x',
    });
    expect(params).toContain('credit');
  });

  it('omits direction clause when direction is "both"', () => {
    const { params } = compile({
      direction: 'both',
      kind: 'contains',
      value: 'x',
    });
    expect(params).not.toContain('debit');
    expect(params).not.toContain('credit');
  });

  it('omits direction clause when direction is undefined', () => {
    const { params } = compile({ kind: 'contains', value: 'x' });
    expect(params).not.toContain('debit');
    expect(params).not.toContain('credit');
  });
});

describe('buildMatchWhere — account clause', () => {
  it('emits equality on accountId when set', () => {
    const { params } = compile({
      accountId: 'acct-xyz',
      kind: 'contains',
      value: 'x',
    });
    expect(params).toContain('acct-xyz');
  });

  it('omits accountId clause when not set', () => {
    const { params } = compile({ kind: 'contains', value: 'x' });
    expect(params).not.toContain('acct-xyz');
  });
});

describe('buildMatchWhere — base scope', () => {
  it('always scopes to user-owned accounts and excludes soft-deleted rows', () => {
    const { params, sql } = compile(
      { kind: 'contains', value: 'x' },
      'user-42',
    );
    expect(params).toContain('user-42');
    expect(sql.toLowerCase()).toContain('is null');
    expect(sql.toLowerCase()).toContain('ledger_accounts');
  });
});
