import { createHmac } from 'node:crypto';

import { env } from '@/env';

/**
 * Hashes an ID using HMAC-SHA256 with LOG_HASH_SECRET.
 * Used to produce stable but non-reversible identifiers for audit logs.
 * Falls back to a static placeholder secret in development if not set.
 */
export const hashId = (id: string): string => {
  return createHmac('sha256', env.LOG_HASH_SECRET).update(id).digest('hex');
};
