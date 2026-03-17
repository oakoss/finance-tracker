import { type } from 'arktype';
import { describe, expect, it } from 'vitest';

import {
  createAccountSchema,
  updateAccountSchema,
} from '@/modules/accounts/validators';

const isError = (result: unknown) => result instanceof type.errors;
const validBase = { currency: 'USD', name: 'Test', type: 'credit_card' };

describe('termsSchema validation', () => {
  it('accepts terms with both minPaymentType and minPaymentValue', () => {
    const result = createAccountSchema({
      ...validBase,
      terms: { minPaymentType: 'percentage', minPaymentValue: 200 },
    });
    expect(isError(result)).toBe(false);
  });

  it('accepts terms with neither minPaymentType nor minPaymentValue', () => {
    const result = createAccountSchema({
      ...validBase,
      terms: { aprBps: 1500 },
    });
    expect(isError(result)).toBe(false);
  });

  it('rejects minPaymentType without minPaymentValue', () => {
    const result = createAccountSchema({
      ...validBase,
      terms: { minPaymentType: 'percentage' },
    });
    expect(isError(result)).toBe(true);
  });

  it('rejects minPaymentValue without minPaymentType', () => {
    const result = createAccountSchema({
      ...validBase,
      terms: { minPaymentValue: 200 },
    });
    expect(isError(result)).toBe(true);
  });

  it('rejects negative aprBps', () => {
    const result = createAccountSchema({
      ...validBase,
      terms: { aprBps: -100 },
    });
    expect(isError(result)).toBe(true);
  });

  it('rejects aprBps above 100000', () => {
    const result = createAccountSchema({
      ...validBase,
      terms: { aprBps: 100_001 },
    });
    expect(isError(result)).toBe(true);
  });

  it('accepts aprBps at boundaries', () => {
    expect(
      isError(createAccountSchema({ ...validBase, terms: { aprBps: 0 } })),
    ).toBe(false);
    expect(
      isError(
        createAccountSchema({ ...validBase, terms: { aprBps: 100_000 } }),
      ),
    ).toBe(false);
  });

  it('rejects negative minPaymentValue', () => {
    const result = createAccountSchema({
      ...validBase,
      terms: { minPaymentType: 'fixed', minPaymentValue: -1 },
    });
    expect(isError(result)).toBe(true);
  });

  it('rejects percentage minPaymentValue above 10000', () => {
    const result = createAccountSchema({
      ...validBase,
      terms: { minPaymentType: 'percentage', minPaymentValue: 10_001 },
    });
    expect(isError(result)).toBe(true);
  });

  it('accepts percentage minPaymentValue at 10000', () => {
    const result = createAccountSchema({
      ...validBase,
      terms: { minPaymentType: 'percentage', minPaymentValue: 10_000 },
    });
    expect(isError(result)).toBe(false);
  });

  it('accepts fixed minPaymentValue above 10000', () => {
    const result = createAccountSchema({
      ...validBase,
      terms: { minPaymentType: 'fixed', minPaymentValue: 50_000 },
    });
    expect(isError(result)).toBe(false);
  });
});

describe('TERMS_TYPES validation', () => {
  it('rejects terms on non-terms account types', () => {
    const result = createAccountSchema({
      ...validBase,
      terms: { aprBps: 1500 },
      type: 'checking',
    });
    expect(isError(result)).toBe(true);
  });

  it('accepts terms on credit_card', () => {
    const result = createAccountSchema({
      ...validBase,
      terms: { aprBps: 1500 },
      type: 'credit_card',
    });
    expect(isError(result)).toBe(false);
  });

  it('accepts terms on loan', () => {
    const result = createAccountSchema({
      ...validBase,
      terms: { aprBps: 1500 },
      type: 'loan',
    });
    expect(isError(result)).toBe(false);
  });
});

describe('updateAccountSchema TERMS_TYPES validation', () => {
  it('accepts terms without type field (existing type not re-validated)', () => {
    const result = updateAccountSchema({ id: 'abc', terms: { aprBps: 1500 } });
    expect(isError(result)).toBe(false);
  });

  it('rejects terms with incompatible type', () => {
    const result = updateAccountSchema({
      id: 'abc',
      terms: { aprBps: 1500 },
      type: 'checking',
    });
    expect(isError(result)).toBe(true);
  });

  it('accepts terms with compatible type', () => {
    const result = updateAccountSchema({
      id: 'abc',
      terms: { aprBps: 1500 },
      type: 'loan',
    });
    expect(isError(result)).toBe(false);
  });
});
