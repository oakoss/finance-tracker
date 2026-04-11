import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { ENV } from 'varlock/env';

/**
 * Hashes an ID using HMAC-SHA256 with LOG_HASH_SECRET.
 * Used to produce stable but non-reversible identifiers for audit logs.
 * Schema provides a dev placeholder; production must set a unique secret.
 *
 * Implemented with `@noble/hashes` so the module can be imported from
 * client code without crashing the browser. Vite's browser shim for
 * `node:crypto` uses getters that throw at module-load time, so a
 * static `import { createHmac } from 'node:crypto'` here would take
 * down any client bundle that transitively reached it.
 */
export const hashId = (id: string): string => {
  const secret = ENV.LOG_HASH_SECRET;
  // Defense in depth. Varlock enforces a 32+ char secret at startup
  // (see .env.schema), but a bypass would otherwise let `@noble/hashes`
  // silently HMAC under an empty key and emit deterministic-but-weak
  // hashes across every audit log. Fail loudly instead.
  if (!secret) {
    throw new Error('LOG_HASH_SECRET is not set; refusing to hash.');
  }
  return bytesToHex(hmac(sha256, utf8ToBytes(secret), utf8ToBytes(id)));
};
