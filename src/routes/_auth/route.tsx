import {
  createFileRoute,
  isRedirect,
  Outlet,
  redirect,
} from '@tanstack/react-router';

import { DefaultShell } from '@/components/layouts/shells/default-shell';
import { getSession } from '@/modules/auth/api/get-session';

export const Route = createFileRoute('/_auth')({
  beforeLoad: async () => {
    try {
      const session = await getSession();

      if (session) {
        throw redirect({ to: '/dashboard' });
      }
    } catch (error) {
      if (isRedirect(error)) throw error;
      // Auth infrastructure failures fall through to show the auth page.
      // getSession() already logs the error server-side via evlog.
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <DefaultShell>
      <div className="flex flex-1 items-center justify-center bg-muted px-4 py-10 text-foreground">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
          <Outlet />
        </div>
      </div>
    </DefaultShell>
  );
}
