/**
 * Keys that must never be forwarded to the drain (last-line-of-defense).
 * Sanitization at the source is the primary strategy; this is a safety net.
 */
const SENSITIVE_KEYS = new Set([
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'password',
  'secret',
  'token',
]);

/**
 * Recursively redact sensitive keys from an event object.
 * Keys are matched case-insensitively against {@link SENSITIVE_KEYS}.
 * Arrays are passed through unchanged; nested objects are recursed into.
 */
export const sanitizeEvent = (
  obj: Record<string, unknown>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      result[key] = sanitizeEvent(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
};
