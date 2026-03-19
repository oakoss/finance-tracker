import { usePostHog } from '@posthog/react';
import { useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';

import { useBroadcastChannel } from '@/hooks/use-broadcast-channel';
import { authClient } from '@/lib/auth/client';
import { clientLog } from '@/lib/logging/client-logger';
import { AUTH_CHANNEL } from '@/modules/auth/constants';
import { m } from '@/paraglide/messages';

export function useSignOut() {
  const router = useRouter();
  const posthog = usePostHog();

  const { postMessage } = useBroadcastChannel<string>(AUTH_CHANNEL);

  function signOut() {
    void authClient
      .signOut()
      .catch((error: unknown) => {
        clientLog.error({
          action: 'auth.signOut',
          error: error instanceof Error ? error.message : String(error),
          outcome: { success: false },
        });
        toast.warning(m['auth.error.signOutIncomplete']());
      })
      .finally(() => {
        try {
          posthog?.reset();
        } catch {
          // Analytics should never break the sign-out flow
        }
        const broadcasted = postMessage('sign-out');
        if (!broadcasted) {
          clientLog.warn({
            action: 'auth.signOut.broadcast',
            outcome: { broadcasted: false },
          });
        }
        void router.navigate({ to: '/sign-in' });
      });
  }

  return signOut;
}
