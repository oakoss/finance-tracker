import { useEffect } from 'react';

import { useAnalytics } from '@/hooks/use-analytics';

/**
 * Identify the authenticated user by ID only.
 * No PII (email, name) is sent — look up users in the app DB.
 */
export function usePostHogIdentity(userId: string) {
  const { identify } = useAnalytics();

  useEffect(() => {
    identify(userId);
  }, [identify, userId]);
}
