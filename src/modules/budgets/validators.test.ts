import { type } from 'arktype';
import { describe, expect, it } from 'vitest';

import {
  createBudgetLineSchema,
  createBudgetPeriodSchema,
  deleteBudgetLineSchema,
  deleteBudgetPeriodSchema,
  updateBudgetLineSchema,
  updateBudgetPeriodSchema,
} from '@/modules/budgets/validators';

const isError = (result: unknown) => result instanceof type.errors;

describe('createBudgetPeriodSchema', () => {
  it('accepts valid period', () => {
    expect(isError(createBudgetPeriodSchema({ month: 6, year: 2025 }))).toBe(
      false,
    );
  });

  it('accepts period with notes', () => {
    expect(
      isError(
        createBudgetPeriodSchema({
          month: 1,
          notes: 'Holiday budget',
          year: 2025,
        }),
      ),
    ).toBe(false);
  });

  it('rejects month below 1', () => {
    expect(isError(createBudgetPeriodSchema({ month: 0, year: 2025 }))).toBe(
      true,
    );
  });

  it('rejects month above 12', () => {
    expect(isError(createBudgetPeriodSchema({ month: 13, year: 2025 }))).toBe(
      true,
    );
  });

  it('rejects non-integer month', () => {
    expect(isError(createBudgetPeriodSchema({ month: 1.5, year: 2025 }))).toBe(
      true,
    );
  });

  it('rejects year below 2000', () => {
    expect(isError(createBudgetPeriodSchema({ month: 6, year: 1999 }))).toBe(
      true,
    );
  });

  it('rejects year above 2100', () => {
    expect(isError(createBudgetPeriodSchema({ month: 6, year: 2101 }))).toBe(
      true,
    );
  });

  it('accepts month at boundaries', () => {
    expect(isError(createBudgetPeriodSchema({ month: 1, year: 2025 }))).toBe(
      false,
    );
    expect(isError(createBudgetPeriodSchema({ month: 12, year: 2025 }))).toBe(
      false,
    );
  });

  it('accepts year at boundaries', () => {
    expect(isError(createBudgetPeriodSchema({ month: 6, year: 2000 }))).toBe(
      false,
    );
    expect(isError(createBudgetPeriodSchema({ month: 6, year: 2100 }))).toBe(
      false,
    );
  });

  it('rejects non-integer year', () => {
    expect(isError(createBudgetPeriodSchema({ month: 6, year: 2025.5 }))).toBe(
      true,
    );
  });

  it('rejects empty notes', () => {
    expect(
      isError(createBudgetPeriodSchema({ month: 6, notes: '', year: 2025 })),
    ).toBe(true);
  });

  it('accepts notes at 500 chars', () => {
    expect(
      isError(
        createBudgetPeriodSchema({
          month: 6,
          notes: 'a'.repeat(500),
          year: 2025,
        }),
      ),
    ).toBe(false);
  });

  it('rejects notes above 500 chars', () => {
    expect(
      isError(
        createBudgetPeriodSchema({
          month: 6,
          notes: 'a'.repeat(501),
          year: 2025,
        }),
      ),
    ).toBe(true);
  });
});

describe('updateBudgetPeriodSchema', () => {
  it('accepts id-only update', () => {
    expect(isError(updateBudgetPeriodSchema({ id: 'abc' }))).toBe(false);
  });

  it('accepts partial fields', () => {
    expect(isError(updateBudgetPeriodSchema({ id: 'abc', month: 3 }))).toBe(
      false,
    );
  });

  it('accepts null notes to clear', () => {
    expect(isError(updateBudgetPeriodSchema({ id: 'abc', notes: null }))).toBe(
      false,
    );
  });

  it('rejects empty id', () => {
    expect(isError(updateBudgetPeriodSchema({ id: '' }))).toBe(true);
  });
});

describe('createBudgetLineSchema', () => {
  const validLine = {
    amountCents: 50_000,
    budgetPeriodId: 'period-1',
    categoryId: 'cat-1',
  };

  it('accepts valid line', () => {
    expect(isError(createBudgetLineSchema(validLine))).toBe(false);
  });

  it('accepts zero amount', () => {
    expect(
      isError(createBudgetLineSchema({ ...validLine, amountCents: 0 })),
    ).toBe(false);
  });

  it('accepts line with notes', () => {
    expect(
      isError(
        createBudgetLineSchema({ ...validLine, notes: 'Groceries target' }),
      ),
    ).toBe(false);
  });

  it('rejects negative amount', () => {
    expect(
      isError(createBudgetLineSchema({ ...validLine, amountCents: -1 })),
    ).toBe(true);
  });

  it('rejects non-integer amount', () => {
    expect(
      isError(createBudgetLineSchema({ ...validLine, amountCents: 100.5 })),
    ).toBe(true);
  });

  it('rejects missing budgetPeriodId', () => {
    const { budgetPeriodId: _, ...rest } = validLine;
    expect(isError(createBudgetLineSchema(rest))).toBe(true);
  });

  it('rejects missing categoryId', () => {
    const { categoryId: _, ...rest } = validLine;
    expect(isError(createBudgetLineSchema(rest))).toBe(true);
  });
});

describe('updateBudgetLineSchema', () => {
  it('accepts id-only update', () => {
    expect(isError(updateBudgetLineSchema({ id: 'abc' }))).toBe(false);
  });

  it('accepts partial amount update', () => {
    expect(
      isError(updateBudgetLineSchema({ amountCents: 75_000, id: 'abc' })),
    ).toBe(false);
  });

  it('accepts null notes to clear', () => {
    expect(isError(updateBudgetLineSchema({ id: 'abc', notes: null }))).toBe(
      false,
    );
  });

  it('rejects negative amount', () => {
    expect(
      isError(updateBudgetLineSchema({ amountCents: -1, id: 'abc' })),
    ).toBe(true);
  });

  it('rejects non-integer amount', () => {
    expect(
      isError(updateBudgetLineSchema({ amountCents: 100.5, id: 'abc' })),
    ).toBe(true);
  });

  it('rejects empty categoryId', () => {
    expect(isError(updateBudgetLineSchema({ categoryId: '', id: 'abc' }))).toBe(
      true,
    );
  });

  it('rejects empty id', () => {
    expect(isError(updateBudgetLineSchema({ id: '' }))).toBe(true);
  });
});

describe('deleteBudgetPeriodSchema', () => {
  const validId = '01961234-5678-7abc-8def-0123456789ab';

  it('accepts valid uuid', () => {
    expect(isError(deleteBudgetPeriodSchema({ id: validId }))).toBe(false);
  });

  it('rejects non-uuid string', () => {
    expect(isError(deleteBudgetPeriodSchema({ id: 'abc' }))).toBe(true);
  });

  it('rejects missing id', () => {
    expect(isError(deleteBudgetPeriodSchema({}))).toBe(true);
  });
});

describe('deleteBudgetLineSchema', () => {
  const validId = '01961234-5678-7abc-8def-0123456789ab';

  it('accepts valid uuid', () => {
    expect(isError(deleteBudgetLineSchema({ id: validId }))).toBe(false);
  });

  it('rejects non-uuid string', () => {
    expect(isError(deleteBudgetLineSchema({ id: 'abc' }))).toBe(true);
  });

  it('rejects missing id', () => {
    expect(isError(deleteBudgetLineSchema({}))).toBe(true);
  });
});
