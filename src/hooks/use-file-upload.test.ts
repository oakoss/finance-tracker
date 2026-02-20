// @vitest-environment node

import { formatBytes } from './use-file-upload';

describe('formatBytes', () => {
  it('returns "0 Bytes" for zero', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('formats bytes (< 1 KB)', () => {
    expect(formatBytes(500)).toBe('500Bytes');
  });

  it('formats exact kilobytes', () => {
    expect(formatBytes(1024)).toBe('1KB');
  });

  it('formats fractional kilobytes', () => {
    expect(formatBytes(1536, 1)).toBe('1.5KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1_048_576)).toBe('1MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1_073_741_824)).toBe('1GB');
  });

  it('formats terabytes', () => {
    expect(formatBytes(1_099_511_627_776)).toBe('1TB');
  });

  it('respects decimal precision', () => {
    // 1.5 MB = 1,572,864 bytes
    expect(formatBytes(1_572_864, 0)).toBe('2MB');
    expect(formatBytes(1_572_864, 1)).toBe('1.5MB');
    expect(formatBytes(1_572_864, 3)).toBe('1.5MB');
  });

  it('clamps negative decimals to 0', () => {
    // Math.max(decimals, 0) should prevent negative precision
    expect(formatBytes(1_572_864, -1)).toBe('2MB');
  });

  it('uses 2 decimal places by default', () => {
    // 1,234,567 bytes ≈ 1.18 MB
    const result = formatBytes(1_234_567);
    expect(result).toBe('1.18MB');
  });
});
