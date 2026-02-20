// @vitest-environment node

import { hashId } from './hash';

describe('hashId', () => {
  it('returns a 64-character hex string', () => {
    const result = hashId('user_123');
    expect(result).toMatch(/^[\da-f]{64}$/);
  });

  it('returns the same hash for the same input', () => {
    expect(hashId('user_123')).toBe(hashId('user_123'));
  });

  it('returns different hashes for different inputs', () => {
    expect(hashId('user_123')).not.toBe(hashId('user_456'));
  });

  it('handles empty string input', () => {
    const result = hashId('');
    expect(result).toMatch(/^[\da-f]{64}$/);
  });

  it('produces consistent 64-char output regardless of input length', () => {
    const short = hashId('a');
    const long = hashId('a'.repeat(10_000));
    expect(short).toHaveLength(64);
    expect(long).toHaveLength(64);
    expect(short).not.toBe(long);
  });
});
