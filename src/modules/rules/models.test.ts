import { type } from 'arktype';
import { expect } from 'vitest';

import {
  matchPredicateSchema,
  ruleActionSchema,
  ruleActionsSchema,
} from '@/modules/rules/models';

describe('matchPredicateSchema', () => {
  it('accepts minimal predicate (kind + value)', () => {
    const result = matchPredicateSchema({ kind: 'contains', value: 'amazon' });
    expect(result instanceof type.errors).toBe(false);
  });

  it('accepts full predicate with amount + account + direction', () => {
    const result = matchPredicateSchema({
      accountId: 'acc-1',
      amountMaxCents: 10_000,
      amountMinCents: 100,
      amountOp: 'between',
      direction: 'debit',
      kind: 'regex',
      value: '^AMZN',
    });
    expect(result instanceof type.errors).toBe(false);
  });

  it('rejects unknown kind', () => {
    const result = matchPredicateSchema({ kind: 'fuzzy', value: 'x' });
    expect(result instanceof type.errors).toBe(true);
  });

  it('rejects non-integer amountMinCents', () => {
    const result = matchPredicateSchema({
      amountMinCents: 10.5,
      amountOp: 'gte',
      kind: 'contains',
      value: 'x',
    });
    expect(result instanceof type.errors).toBe(true);
  });

  it('rejects missing value', () => {
    const result = matchPredicateSchema({ kind: 'contains' });
    expect(result instanceof type.errors).toBe(true);
  });

  it('rejects amount bounds without amountOp', () => {
    const result = matchPredicateSchema({
      amountMinCents: 100,
      kind: 'contains',
      value: 'x',
    });
    expect(result instanceof type.errors).toBe(true);
  });

  it('rejects amountOp "between" with only amountMin', () => {
    const result = matchPredicateSchema({
      amountMinCents: 100,
      amountOp: 'between',
      kind: 'contains',
      value: 'x',
    });
    expect(result instanceof type.errors).toBe(true);
  });

  it('rejects amountOp "gte" without amountMinCents', () => {
    const result = matchPredicateSchema({
      amountMaxCents: 500,
      amountOp: 'gte',
      kind: 'contains',
      value: 'x',
    });
    expect(result instanceof type.errors).toBe(true);
  });

  it('rejects amountOp "lte" without amountMaxCents', () => {
    const result = matchPredicateSchema({
      amountMinCents: 500,
      amountOp: 'lte',
      kind: 'contains',
      value: 'x',
    });
    expect(result instanceof type.errors).toBe(true);
  });

  it('rejects amountOp "eq" without any bound', () => {
    const result = matchPredicateSchema({
      amountOp: 'eq',
      kind: 'contains',
      value: 'x',
    });
    expect(result instanceof type.errors).toBe(true);
  });

  it('rejects amountOp "eq" with both amountMinCents and amountMaxCents', () => {
    const result = matchPredicateSchema({
      amountMaxCents: 500,
      amountMinCents: 100,
      amountOp: 'eq',
      kind: 'contains',
      value: 'x',
    });
    expect(result instanceof type.errors).toBe(true);
  });

  it('rejects amountMinCents > amountMaxCents', () => {
    const result = matchPredicateSchema({
      amountMaxCents: 100,
      amountMinCents: 500,
      amountOp: 'between',
      kind: 'contains',
      value: 'x',
    });
    expect(result instanceof type.errors).toBe(true);
  });

  it('accepts amountOp "eq" with only amountMinCents', () => {
    const result = matchPredicateSchema({
      amountMinCents: 500,
      amountOp: 'eq',
      kind: 'contains',
      value: 'x',
    });
    expect(result instanceof type.errors).toBe(false);
  });

  it('accepts amountOp "gte" with only amountMinCents', () => {
    const result = matchPredicateSchema({
      amountMinCents: 500,
      amountOp: 'gte',
      kind: 'contains',
      value: 'x',
    });
    expect(result instanceof type.errors).toBe(false);
  });

  it('accepts amountOp "lte" with only amountMaxCents', () => {
    const result = matchPredicateSchema({
      amountMaxCents: 500,
      amountOp: 'lte',
      kind: 'contains',
      value: 'x',
    });
    expect(result instanceof type.errors).toBe(false);
  });

  it('accepts amountOp "between" with equal min and max', () => {
    const result = matchPredicateSchema({
      amountMaxCents: 500,
      amountMinCents: 500,
      amountOp: 'between',
      kind: 'contains',
      value: 'x',
    });
    expect(result instanceof type.errors).toBe(false);
  });
});

describe('ruleActionSchema', () => {
  it('accepts setCategory', () => {
    const result = ruleActionSchema({
      categoryId: 'cat-1',
      kind: 'setCategory',
    });
    expect(result instanceof type.errors).toBe(false);
  });

  it('accepts setPayee', () => {
    const result = ruleActionSchema({ kind: 'setPayee', payeeId: 'p-1' });
    expect(result instanceof type.errors).toBe(false);
  });

  it('accepts setTags with replace mode', () => {
    const result = ruleActionSchema({
      kind: 'setTags',
      mode: 'replace',
      tagIds: ['t-1', 't-2'],
    });
    expect(result instanceof type.errors).toBe(false);
  });

  it('accepts setTags with append mode and empty tag list', () => {
    const result = ruleActionSchema({
      kind: 'setTags',
      mode: 'append',
      tagIds: [],
    });
    expect(result instanceof type.errors).toBe(false);
  });

  it('accepts setExcludedFromBudget', () => {
    const result = ruleActionSchema({
      kind: 'setExcludedFromBudget',
      value: true,
    });
    expect(result instanceof type.errors).toBe(false);
  });

  it('accepts setNote', () => {
    const result = ruleActionSchema({ kind: 'setNote', value: 'imported' });
    expect(result instanceof type.errors).toBe(false);
  });

  it('rejects unknown kind', () => {
    const result = ruleActionSchema({ kind: 'setUnknown' });
    expect(result instanceof type.errors).toBe(true);
  });

  it('rejects setCategory without categoryId', () => {
    const result = ruleActionSchema({ kind: 'setCategory' });
    expect(result instanceof type.errors).toBe(true);
  });

  it('rejects setTags with invalid mode', () => {
    const result = ruleActionSchema({
      kind: 'setTags',
      mode: 'merge',
      tagIds: [],
    });
    expect(result instanceof type.errors).toBe(true);
  });
});

describe('ruleActionsSchema', () => {
  it('accepts single-element array', () => {
    const result = ruleActionsSchema([
      { categoryId: 'c-1', kind: 'setCategory' },
    ]);
    expect(result instanceof type.errors).toBe(false);
  });

  it('accepts multi-element array with mixed actions', () => {
    const result = ruleActionsSchema([
      { categoryId: 'c-1', kind: 'setCategory' },
      { kind: 'setPayee', payeeId: 'p-1' },
      { kind: 'setNote', value: 'imported' },
    ]);
    expect(result instanceof type.errors).toBe(false);
  });

  it('rejects empty array', () => {
    const result = ruleActionsSchema([]);
    expect(result instanceof type.errors).toBe(true);
  });

  it('rejects array with invalid action', () => {
    const result = ruleActionsSchema([
      { categoryId: 'c-1', kind: 'setCategory' },
      { kind: 'setBadAction' },
    ]);
    expect(result instanceof type.errors).toBe(true);
  });
});
