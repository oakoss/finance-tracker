export const E2E_EMAIL = process.env.E2E_USER_EMAIL ?? 'e2e@test.local';
export const E2E_PASSWORD = process.env.E2E_USER_PASSWORD ?? 'E2ePassword1!';

/** Number of per-worker E2E users to seed (must be >= max Playwright workers). */
export const E2E_USER_COUNT = 6;

/** Email for a specific worker index. */
export function e2eEmail(index: number): string {
  return `e2e-worker-${index}@test.local`;
}

// React hydration mismatches (#418, #423) are expected for relative
// timestamps and other client-dependent text. Filter them from
// pageerror detection so they don't fail tests.
export const HYDRATION_ERROR_RE = /Minified React error #(418|423)/;

/** Display name for a specific worker index. */
export function e2eDisplayName(index: number): string {
  return `E2E Worker ${index}`;
}

export type IsoUtcInstant = string & { readonly __brand: 'IsoUtcInstant' };

const ISO_UTC_INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

export function isoUtcInstant(value: string): IsoUtcInstant {
  if (!ISO_UTC_INSTANT_RE.test(value)) {
    throw new Error(`Invalid ISO UTC instant: ${value}`);
  }
  return value as IsoUtcInstant;
}

export const FROZEN_E2E_TIME = isoUtcInstant('2026-03-10T21:05:00.000Z');
