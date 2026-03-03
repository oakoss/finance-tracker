import { useEffect, useSyncExternalStore } from 'react';

// eslint-disable-next-line @typescript-eslint/no-empty-function -- no-op unsubscribe
function noop() {}

function emptySubscribe() {
  return noop;
}

/**
 * Returns `false` during SSR and the initial hydration render pass,
 * then `true` on the first client render once React hydrates.
 *
 * Uses `useSyncExternalStore` so the server snapshot (`false`) is
 * returned during the hydration pass, and the client snapshot (`true`)
 * takes over immediately after — no `useEffect` delay, no context
 * provider needed.
 *
 * Reference: https://tkdodo.eu/blog/avoiding-hydration-mismatches-with-use-sync-external-store
 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/**
 * Sets `data-hydrated` on `<body>` for Playwright's
 * `waitForHydration()` helper. Mount once at the app root.
 */
function useHydratedAttribute(): void {
  useEffect(() => {
    document.body.dataset.hydrated = '';
    return () => {
      delete document.body.dataset.hydrated;
    };
  }, []);
}

export { useHydrated, useHydratedAttribute };
