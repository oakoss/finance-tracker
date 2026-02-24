import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { RouterLink } from '@/components/ui/link';
import { appConfig } from '@/configs/app';
import { useSignOut } from '@/hooks/use-sign-out';
import { authClient } from '@/lib/auth-client';

export function DefaultShell({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="flex h-14 w-full items-center justify-between px-4 lg:px-6">
          <RouterLink size="lg" to="/" variant="subtle">
            {appConfig.name}
          </RouterLink>
          <div className="flex items-center gap-4">
            {session?.user ? (
              <DefaultShellUserNav name={session.user.name} />
            ) : (
              <>
                <RouterLink to="/login">Sign in</RouterLink>
                <RouterLink to="/signup">Sign up</RouterLink>
              </>
            )}
            <ModeToggle />
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}

function DefaultShellUserNav({ name }: { name: string }) {
  const handleSignOut = useSignOut();

  return (
    <>
      <span className="text-sm text-muted-foreground">{name}</span>
      <Button size="sm" variant="outline" onClick={handleSignOut}>
        Sign out
      </Button>
    </>
  );
}
