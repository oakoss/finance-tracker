import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-empty-function -- intentional no-op
export function noop(): void {}

/** Stable no-op subscribe for `useSyncExternalStore` (value never changes externally). */
export function emptySubscribe(): () => void {
  return noop;
}
