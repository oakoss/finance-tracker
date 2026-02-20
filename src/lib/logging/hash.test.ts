// @vitest-environment node

import { hashId } from './hash';

describe('hashId', () => {
  it('returns a hex string', () => {
    const result = hashId('user_123');
    expect(result).toMatch(/^[\da-f]{64}$/);
  });

  it('returns the same hash for the same input', () => {
    expect(hashId('user_123')).toBe(hashId('user_123'));
  });

  it('returns different hashes for different inputs', () => {
    expect(hashId('user_123')).not.toBe(hashId('user_456'));
  });
});
