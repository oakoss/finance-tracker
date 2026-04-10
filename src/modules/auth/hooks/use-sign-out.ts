import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';

import { useAnalytics } from '@/hooks/use-analytics';
import { useBroadcastChannel } from '@/hooks/use-broadcast-channel';
import { authClient } from '@/lib/auth/client';
import { clientLog } from '@/lib/logging/client-logger';
import { AUTH_CHANNEL } from '@/modules/auth/constants';
import { m } from '@/paraglide/messages';

export function useSignOut() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { capture, reset } = useAnalytics();

  const { postMessage } = useBroadcastChannel<string>(AUTH_CHANNEL);

  function signOut() {
    void authClient
      .signOut()
      .then(() => {
        capture('user_signed_out');
      })
      .catch((error: unknown) => {
        clientLog.error({
          action: 'auth.signOut',
          error: error instanceof Error ? error.message : String(error),
          outcome: { success: false },
        });
        toast.warning(m['auth.error.signOutIncomplete']());
      })
      .finally(() => {
        queryClient.clear();
        reset();
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
