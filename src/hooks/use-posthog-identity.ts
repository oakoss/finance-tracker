import { usePostHog } from '@posthog/react';
import { useEffect } from 'react';

/**
 * Identify the authenticated user with PostHog by ID only.
 * No PII (email, name) is sent — look up users in the app DB.
 */
export function usePostHogIdentity(userId: string) {
  const posthog = usePostHog();

  useEffect(() => {
    if (!posthog) return;

    try {
      posthog.identify(userId);
    } catch {
      // Analytics should never crash the authenticated layout
    }
  }, [posthog, userId]);
}
