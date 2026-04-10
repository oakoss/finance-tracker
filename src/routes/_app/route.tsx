import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { AppHeader } from '@/components/layouts/app/app-header';
import { SidebarShell } from '@/components/layouts/shells/sidebar-shell';
import { usePostHogIdentity } from '@/hooks/use-posthog-identity';
import { getDeletionRequest } from '@/modules/auth/api/get-deletion-request';
import { getSession } from '@/modules/auth/api/get-session';
import { DeletionBanner } from '@/modules/auth/components/deletion-banner';
import { preferencesQueries } from '@/modules/preferences/hooks/use-preferences';

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ location }) => {
    const session = await getSession();

    if (!session) {
      throw redirect({ search: { redirect: location.href }, to: '/sign-in' });
    }

    // Non-critical — banner not showing is acceptable if query fails
    let deletionRequest = null;
    try {
      deletionRequest = await getDeletionRequest();
    } catch {
      // Logged server-side by handleServerFnError
    }

    return { deletionRequest, session };
  },
  component: AppLayout,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(preferencesQueries.detail());
  },
});

function AppLayout() {
  const { deletionRequest, session } = Route.useRouteContext();
  usePostHogIdentity(session.user.id);

  return (
    <SidebarShell
      user={{
        avatar: session.user.image,
        email: session.user.email,
        name: session.user.name,
      }}
    >
      <AppHeader />
      {deletionRequest && (
        <DeletionBanner purgeAfter={deletionRequest.purgeAfter} />
      )}
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </SidebarShell>
  );
}
