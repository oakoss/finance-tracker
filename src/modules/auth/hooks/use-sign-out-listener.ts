import { useRouter } from '@tanstack/react-router';

import { useBroadcastChannel } from '@/hooks/use-broadcast-channel';
import { AUTH_CHANNEL } from '@/modules/auth/constants';

/**
 * Listens for cross-tab sign-out broadcasts and navigates to /sign-in.
 *
 * Mount this in a component that is always rendered (e.g., SidebarShell)
 * so the listener is active regardless of mobile sidebar state.
 */
export function useSignOutListener() {
  const router = useRouter();

  useBroadcastChannel<string>(AUTH_CHANNEL, {
    onMessage: (data) => {
      if (data === 'sign-out') {
        void router.navigate({ to: '/sign-in' });
      }
    },
  });
}
