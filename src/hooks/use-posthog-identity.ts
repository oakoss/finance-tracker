import { usePostHog } from '@posthog/react';
import { useEffect } from 'react';

import type { AuthClientSession } from '@/lib/auth/client';

/**
 * Identify the authenticated user with PostHog. Call in the
 * authenticated layout so it runs once per session lifecycle.
 */
export function usePostHogIdentity(user: AuthClientSession['user']) {
  const posthog = usePostHog();

  useEffect(() => {
    if (!posthog) return;

    posthog.identify(user.id, { email: user.email, name: user.name });
  }, [posthog, user.id, user.email, user.name]);
}
