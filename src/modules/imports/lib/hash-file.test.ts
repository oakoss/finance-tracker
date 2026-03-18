// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { hashFileContent } from '@/modules/imports/lib/hash-file';

describe('hashFileContent', () => {
  it('produces a 64-character hex string (SHA-256)', async () => {
    const hash = await hashFileContent('hello world');
    expect(hash).toMatch(/^[\da-f]{64}$/);
  });

  it('is deterministic — same input produces same hash', async () => {
    const hash1 = await hashFileContent('test content');
    const hash2 = await hashFileContent('test content');
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different content', async () => {
    const hash1 = await hashFileContent('file a');
    const hash2 = await hashFileContent('file b');
    expect(hash1).not.toBe(hash2);
  });
});
