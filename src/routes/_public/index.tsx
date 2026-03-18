import { createFileRoute, isRedirect, redirect } from '@tanstack/react-router';

import { Icons } from '@/components/icons';
import { appConfig } from '@/configs/app';
import { getSession } from '@/modules/auth/api/get-session';
import { m } from '@/paraglide/messages';

export const Route = createFileRoute('/_public/')({
  beforeLoad: async () => {
    try {
      const session = await getSession();

      if (session) {
        throw redirect({ to: '/dashboard' });
      }
    } catch (error) {
      if (isRedirect(error)) throw error;
      // Auth infrastructure failures fall through to show the landing page.
      // getSession() already logs the error server-side via evlog.
    }
  },
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-20 text-center">
      <Icons.Logo className="size-12 text-primary" />
      <h1 className="text-4xl font-bold tracking-tight">{appConfig.name}</h1>
      <p className="max-w-md text-lg text-muted-foreground">
        {m['landing.description']()}
      </p>
    </div>
  );
}
