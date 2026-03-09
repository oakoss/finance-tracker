export const E2E_EMAIL = process.env.E2E_USER_EMAIL ?? 'e2e@test.local';
export const E2E_PASSWORD = process.env.E2E_USER_PASSWORD ?? 'E2ePassword1!';

/** Number of per-worker E2E users to seed (must be >= max Playwright workers). */
export const E2E_USER_COUNT = 6;

/** Email for a specific worker index. */
export function e2eEmail(index: number): string {
  return `e2e-worker-${index}@test.local`;
}

/** Display name for a specific worker index. */
export function e2eDisplayName(index: number): string {
  return `E2E Worker ${index}`;
}
