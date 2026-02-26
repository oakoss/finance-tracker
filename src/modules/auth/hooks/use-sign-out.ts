import { useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';

import { useBroadcastChannel } from '@/hooks/use-broadcast-channel';
import { authClient } from '@/lib/auth-client';
import { clientLog } from '@/lib/logging/client-logger';
import { m } from '@/paraglide/messages';

const AUTH_CHANNEL = 'auth';

export function useSignOut() {
  const router = useRouter();

  function navigateToSignIn() {
    void router.navigate({ to: '/sign-in' });
  }

  const { postMessage } = useBroadcastChannel<string>(AUTH_CHANNEL, {
    onMessage: (data) => {
      if (data === 'sign-out') {
        navigateToSignIn();
      }
    },
  });

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
        const broadcasted = postMessage('sign-out');
        if (!broadcasted) {
          clientLog.warn({
            action: 'auth.signOut.broadcast',
            outcome: { broadcasted: false },
          });
        }
        navigateToSignIn();
      });
  }

  return signOut;
}
