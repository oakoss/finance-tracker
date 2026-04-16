import { type } from 'arktype';
import { expect } from 'vitest';

import { reorderMerchantRulesSchema } from '@/modules/rules/validators';

const isError = (result: unknown) => result instanceof type.errors;

describe('reorderMerchantRulesSchema', () => {
  it('accepts a non-empty unique orderedIds list', () => {
    const result = reorderMerchantRulesSchema({
      orderedIds: ['r-1', 'r-2', 'r-3'],
      stage: 'default',
    });
    expect(isError(result)).toBe(false);
  });

  it('rejects an empty orderedIds list', () => {
    const result = reorderMerchantRulesSchema({
      orderedIds: [],
      stage: 'default',
    });
    expect(isError(result)).toBe(true);
  });

  it('rejects duplicate ids in orderedIds', () => {
    const result = reorderMerchantRulesSchema({
      orderedIds: ['r-1', 'r-2', 'r-1'],
      stage: 'default',
    });
    expect(isError(result)).toBe(true);
  });

  it('rejects an unknown stage', () => {
    const result = reorderMerchantRulesSchema({
      orderedIds: ['r-1'],
      stage: 'midway',
    });
    expect(isError(result)).toBe(true);
  });
});
