// @vitest-environment node
import { computeRowFingerprint } from '@/modules/imports/lib/compute-row-fingerprint';

const validRow = {
  amountCents: -450,
  description: 'Coffee Shop',
  memo: 'morning latte',
  transactionAt: '2024-01-15',
};

describe('computeRowFingerprint', () => {
  it('returns a 64-character hex string for valid input', () => {
    const fp = computeRowFingerprint(validRow);
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', () => {
    expect(computeRowFingerprint(validRow)).toBe(
      computeRowFingerprint(validRow),
    );
  });

  it('produces different hashes for different inputs', () => {
    const fp1 = computeRowFingerprint(validRow);
    const fp2 = computeRowFingerprint({ ...validRow, amountCents: -500 });
    expect(fp1).not.toBe(fp2);
  });

  it('returns null when description is missing', () => {
    expect(
      computeRowFingerprint({ amountCents: -450, transactionAt: '2024-01-15' }),
    ).toBeNull();
  });

  it('returns null when amountCents is missing', () => {
    expect(
      computeRowFingerprint({
        description: 'Coffee',
        transactionAt: '2024-01-15',
      }),
    ).toBeNull();
  });

  it('returns null when transactionAt is missing', () => {
    expect(
      computeRowFingerprint({ amountCents: -450, description: 'Coffee' }),
    ).toBeNull();
  });

  it('treats empty memo and undefined memo as equivalent', () => {
    const withEmpty = computeRowFingerprint({ ...validRow, memo: '' });
    const withUndefined = computeRowFingerprint({
      amountCents: validRow.amountCents,
      description: validRow.description,
      transactionAt: validRow.transactionAt,
    });
    expect(withEmpty).toBe(withUndefined);
  });

  it('produces different hashes for different memo values', () => {
    const fp1 = computeRowFingerprint(validRow);
    const fp2 = computeRowFingerprint({ ...validRow, memo: 'different memo' });
    expect(fp1).not.toBe(fp2);
  });
});
