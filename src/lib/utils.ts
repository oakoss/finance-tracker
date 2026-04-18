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
 * Preferred over `{ ...obj, key: undefined }` which `exactOptionalPropertyTypes`
 * rejects, and over `{ key: _key, ...rest }` destructures when clearing
 * multiple keys. Rebuilds via `Object.fromEntries` rather than `delete` to
 * avoid V8 hidden-class deopts. `T extends object` admits arrays and class
 * instances at the type level — undefined behavior at runtime.
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
