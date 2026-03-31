// @vitest-environment node
import { parseCsvString } from '@/modules/imports/lib/parse-csv';

describe('parseCsvString', () => {
  it('parses standard CSV with headers', () => {
    const csv = `Date,Description,Amount\n2024-01-15,Coffee,-4.50\n2024-01-16,Paycheck,2500.00`;
    const result = parseCsvString(csv);

    expect(result.headers).toEqual(['Date', 'Description', 'Amount']);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({
      Amount: '-4.50',
      Date: '2024-01-15',
      Description: 'Coffee',
    });
    expect(result.errorCount).toBe(0);
  });

  it('parses quoted fields with commas', () => {
    const csv = `Date,Description,Amount\n2024-01-15,"AMAZON.COM, INC.",-42.99`;
    const result = parseCsvString(csv);

    expect(result.data[0]).toEqual({
      Amount: '-42.99',
      Date: '2024-01-15',
      Description: 'AMAZON.COM, INC.',
    });
    expect(result.errorCount).toBe(0);
  });

  it('returns empty data for headers-only CSV', () => {
    const csv = 'Date,Description,Amount\n';
    const result = parseCsvString(csv, { skipEmptyLines: true });

    expect(result.headers).toEqual(['Date', 'Description', 'Amount']);
    expect(result.data).toHaveLength(0);
  });

  it('returns empty result for empty string', () => {
    const result = parseCsvString('');

    expect(result.headers).toEqual([]);
    expect(result.data).toHaveLength(0);
  });

  it('returns all rows with errorCount > 0 for extra fields', () => {
    const csv = `Date,Description,Amount\n2024-01-15,Coffee,-4.50\n2024-01-16,Paycheck,2500.00,extrafield\n2024-01-17,Groceries,-85.23`;
    const result = parseCsvString(csv);

    expect(result.data).toHaveLength(3);
    expect(result.errorCount).toBeGreaterThan(0);
  });

  it('strips BOM and parses correctly', () => {
    const bom = '\uFEFF';
    const csv = `${bom}Date,Description,Amount\n2024-01-15,Coffee,-4.50`;
    const result = parseCsvString(csv);

    expect(result.headers).toEqual(['Date', 'Description', 'Amount']);
    expect(result.data).toHaveLength(1);
  });

  it('limits rows with maxRows', () => {
    const csv = `Date,Description,Amount\n2024-01-15,A,-1\n2024-01-16,B,-2\n2024-01-17,C,-3`;
    const result = parseCsvString(csv, { maxRows: 2 });

    expect(result.data).toHaveLength(2);
  });

  it('skips empty lines when skipEmptyLines is true', () => {
    const csv = `Date,Description,Amount\n2024-01-15,Coffee,-4.50\n\n2024-01-16,Paycheck,2500.00`;
    const result = parseCsvString(csv, { skipEmptyLines: true });

    expect(result.data).toHaveLength(2);
  });

  it('does not skip empty lines by default', () => {
    const csv = `Date,Description,Amount\n2024-01-15,Coffee,-4.50\n\n2024-01-16,Paycheck,2500.00`;
    const result = parseCsvString(csv);

    expect(result.data).toHaveLength(3);
  });

  it('parses fields with escaped quotes', () => {
    const csv = `Name,Value\n"She said ""hello""",123`;
    const result = parseCsvString(csv);

    expect(result.data[0]).toEqual({ Name: 'She said "hello"', Value: '123' });
  });

  it('handles CRLF line endings', () => {
    const csv = `Date,Amount\r\n2024-01-15,-4.50\r\n2024-01-16,2500.00`;
    const result = parseCsvString(csv);

    expect(result.data).toHaveLength(2);
    expect(result.headers).toEqual(['Date', 'Amount']);
  });

  it('handles fields with embedded newlines', () => {
    const csv = `Date,Description,Amount\n2024-01-15,"Line1\nLine2",-4.50`;
    const result = parseCsvString(csv);

    expect(result.data[0]).toEqual({
      Amount: '-4.50',
      Date: '2024-01-15',
      Description: 'Line1\nLine2',
    });
  });

  it('preserves whitespace in fields (no trimming)', () => {
    const csv = `Date,Description,Amount\n2024-01-15, Coffee Shop , -4.50 `;
    const result = parseCsvString(csv);

    expect(result.data[0]?.Description).toBe(' Coffee Shop ');
    expect(result.data[0]?.Amount).toBe(' -4.50 ');
  });

  it('returns headers for header-only CSV without trailing newline', () => {
    const csv = 'Date,Description,Amount';
    const result = parseCsvString(csv);

    expect(result.headers).toEqual(['Date', 'Description', 'Amount']);
    expect(result.data).toHaveLength(0);
  });

  it('auto-detects semicolon delimiter', () => {
    const csv = `Date;Description;Amount\n2024-01-15;Coffee;-4.50`;
    const result = parseCsvString(csv);

    expect(result.headers).toEqual(['Date', 'Description', 'Amount']);
    expect(result.data[0]).toEqual({
      Amount: '-4.50',
      Date: '2024-01-15',
      Description: 'Coffee',
    });
  });
});
