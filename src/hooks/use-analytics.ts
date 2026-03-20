import { usePostHog } from 'posthog-js/react';
import { useCallback, useMemo } from 'react';

import { clientLog } from '@/lib/logging/client-logger';

/** Guarded PostHog wrapper — analytics errors never propagate. */
export function useAnalytics() {
  const posthog = usePostHog();

  const capture = useCallback(
    (event: string, properties?: Record<string, unknown>) => {
      try {
        posthog?.capture(event, properties);
      } catch (error) {
        clientLog.warn({
          action: 'analytics.capture',
          error: error instanceof Error ? error.message : String(error),
          event,
        });
      }
    },
    [posthog],
  );

  const identify = useCallback(
    (userId: string) => {
      try {
        posthog?.identify(userId);
      } catch (error) {
        clientLog.warn({
          action: 'analytics.identify',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [posthog],
  );

  const reset = useCallback(() => {
    try {
      posthog?.reset();
    } catch (error) {
      clientLog.warn({
        action: 'analytics.reset',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [posthog]);

  return useMemo(
    () => ({ capture, identify, reset }),
    [capture, identify, reset],
  );
}
