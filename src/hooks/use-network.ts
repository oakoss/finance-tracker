import { useCallback, useSyncExternalStore } from 'react';

function getOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export function useNetwork() {
  const subscribe = useCallback((callback: () => void) => {
    globalThis.addEventListener('online', callback);
    globalThis.addEventListener('offline', callback);
    return () => {
      globalThis.removeEventListener('online', callback);
      globalThis.removeEventListener('offline', callback);
    };
  }, []);

  const online = useSyncExternalStore(subscribe, getOnline, getServerSnapshot);

  return { online };
}
