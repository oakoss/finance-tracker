import { useRouter } from '@tanstack/react-router';

import { authClient } from '@/lib/auth-client';
import { clientLog } from '@/lib/logging/client-logger';

export function useSignOut() {
  const router = useRouter();

  const signOut = () => {
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
        void router.navigate({ to: '/login' });
      });
  };

  return signOut;
}
