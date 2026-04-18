import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// oxlint-disable-next-line no-empty-function -- intentional no-op
export function noop(): void {}

/** Stable no-op subscribe for `useSyncExternalStore` (value never changes externally). */
export function emptySubscribe(): () => void {
  return noop;
}

/**
 * Returns a shallow copy of `obj` without the listed keys. Preferred over
 * `{ ...obj, key: undefined }` which `exactOptionalPropertyTypes` rejects,
 * and over `const { key: _key, ...rest }` destructures when clearing
 * multiple keys. Rebuilds via `Object.fromEntries` rather than `delete`
 * to avoid the V8 hidden-class deopt and survive stricter TS passes.
 * Intended for plain record-like objects; passing arrays or class
 * instances is technically allowed by `T extends object` but undefined
 * behavior — TS can't express "plain object" structurally.
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Omit<T, K> {
  const skip = new Set<PropertyKey>(keys);
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !skip.has(key)),
  ) as Omit<T, K>;
}
