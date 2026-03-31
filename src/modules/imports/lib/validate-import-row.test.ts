// @vitest-environment node
import { validateImportRow } from '@/modules/imports/lib/validate-import-row';

const validRow = {
  amountCents: -450,
  description: 'Coffee Shop',
  transactionAt: '2024-01-15',
};

describe('validateImportRow', () => {
  it('returns valid for a complete row', () => {
    const result = validateImportRow(validRow);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns error for missing description', () => {
    const { description: _, ...rest } = validRow;
    const result = validateImportRow(rest);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required field: description');
  });

  it('returns error for empty string description', () => {
    const result = validateImportRow({ ...validRow, description: '  ' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required field: description');
  });

  it('returns error for missing amountCents', () => {
    const { amountCents: _, ...rest } = validRow;
    const result = validateImportRow(rest);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required field: amount');
  });

  it('returns error for NaN amountCents', () => {
    const result = validateImportRow({ ...validRow, amountCents: Number.NaN });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required field: amount');
  });

  it('returns error for Infinity amountCents', () => {
    const result = validateImportRow({
      ...validRow,
      amountCents: Number.POSITIVE_INFINITY,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required field: amount');
  });

  it('returns error for missing transactionAt', () => {
    const { transactionAt: _, ...rest } = validRow;
    const result = validateImportRow(rest);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required field: transactionAt');
  });

  it('returns multiple errors when multiple fields missing', () => {
    const result = validateImportRow({});
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(3);
  });

  it('accepts zero amountCents as valid', () => {
    const result = validateImportRow({ ...validRow, amountCents: 0 });
    expect(result.valid).toBe(true);
  });

  it('does not validate optional fields', () => {
    const result = validateImportRow({
      ...validRow,
      categoryName: '',
      memo: '',
      payeeName: '',
    });
    expect(result.valid).toBe(true);
  });

  it('includes raw amount value in error when available', () => {
    const { amountCents: _, ...rest } = validRow;
    const result = validateImportRow({ ...rest, amountRaw: 'N/A' });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/Could not parse amount: "N\/A"/);
  });
});
