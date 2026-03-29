import { createHmac } from 'node:crypto';
import { ENV } from 'varlock/env';

/**
 * Hashes an ID using HMAC-SHA256 with LOG_HASH_SECRET.
 * Used to produce stable but non-reversible identifiers for audit logs.
 * Schema provides a dev placeholder; production must set a unique secret.
 */
export const hashId = (id: string): string => {
  return createHmac('sha256', ENV.LOG_HASH_SECRET).update(id).digest('hex');
};
