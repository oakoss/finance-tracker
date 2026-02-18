import { Button, RouterButton } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';

export default function BetterAuthHeader() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="size-8 bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        {session.user.image ? (
          <img alt="" className="size-8" src={session.user.image} />
        ) : (
          <div className="size-8 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              {session.user.name
                ? session.user.name.charAt(0).toUpperCase()
                : 'U'}
            </span>
          </div>
        )}
        <Button onClick={() => authClient.signOut()}>Sign out</Button>
      </div>
    );
  }

  return <RouterButton to="/demo/better-auth">Sign in</RouterButton>;
}
