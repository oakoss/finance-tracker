import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { AppHeader } from '@/components/layouts/app/app-header';
import { SidebarShell } from '@/components/layouts/shells/sidebar-shell';
import { getSession } from '@/modules/auth/api/get-session';

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ location }) => {
    const session = await getSession();

    if (!session) {
      throw redirect({
        search: { redirect: location.href },
        to: '/sign-in',
      });
    }

    return { session };
  },
  component: AppLayout,
});

function AppLayout() {
  const { session } = Route.useRouteContext();

  return (
    <SidebarShell
      user={{
        avatar: session.user.image,
        email: session.user.email,
        name: session.user.name,
      }}
    >
      <AppHeader />
      {/* Banner region — consumers render here via TREK-114, TREK-106 */}
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </SidebarShell>
  );
}
