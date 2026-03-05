import { type } from 'arktype';
import { describe, expect, it } from 'vitest';

import { dateOrNull, dateString } from '@/lib/form/schema';

const isError = (result: unknown) => result instanceof type.errors;

describe('dateString', () => {
  it('accepts ISO-8601 date strings', () => {
    expect(dateString('2024-01-15')).toBe('2024-01-15');
    expect(dateString('2024-01-15T10:30:00Z')).toBe('2024-01-15T10:30:00Z');
  });

  it('rejects empty strings', () => {
    expect(isError(dateString(''))).toBe(true);
  });

  it('rejects non-ISO date formats', () => {
    expect(isError(dateString('Tuesday'))).toBe(true);
    expect(isError(dateString('Jan 15, 2024'))).toBe(true);
    expect(isError(dateString('1/15/2024'))).toBe(true);
    expect(isError(dateString('15-01-2024'))).toBe(true);
  });

  it('rejects invalid ISO dates', () => {
    expect(isError(dateString('9999-99-99'))).toBe(true);
  });
});

describe('dateOrNull', () => {
  it('accepts ISO-8601 date strings', () => {
    expect(dateOrNull('2024-06-01')).toBe('2024-06-01');
  });

  it('pipes empty string to null', () => {
    expect(dateOrNull('')).toBeNull();
  });

  it('accepts null', () => {
    expect(dateOrNull(null)).toBeNull();
  });

  it('rejects non-ISO date formats', () => {
    expect(isError(dateOrNull('Tuesday'))).toBe(true);
    expect(isError(dateOrNull('Feb 2024'))).toBe(true);
  });
});
