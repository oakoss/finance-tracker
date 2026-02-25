import { useRouter } from '@tanstack/react-router';

import { useBroadcastChannel } from '@/hooks/use-broadcast-channel';
import { authClient } from '@/lib/auth-client';
import { clientLog } from '@/lib/logging/client-logger';

const AUTH_CHANNEL = 'auth';

export function useSignOut() {
  const router = useRouter();

  function navigateToLogin() {
    void router.navigate({ to: '/login' });
  }

  const { postMessage } = useBroadcastChannel<string>(AUTH_CHANNEL, {
    onMessage: (data) => {
      if (data === 'sign-out') {
        navigateToLogin();
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
      })
      .finally(() => {
        const broadcasted = postMessage('sign-out');
        if (!broadcasted) {
          clientLog.warn({
            action: 'auth.signOut.broadcast',
            outcome: { broadcasted: false },
          });
        }
        navigateToLogin();
      });
  }

  return signOut;
}
