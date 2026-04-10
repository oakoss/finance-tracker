import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';

import { Icons } from '@/components/icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { authClient } from '@/lib/auth/client';
import { clientLog } from '@/lib/logging/client-logger';
import { parseError } from '@/lib/logging/evlog';
import { linkedAccountQueries } from '@/modules/auth/hooks/use-linked-accounts';
import { m } from '@/paraglide/messages';

const providerIcons: Record<string, React.ReactNode> = {
  credential: <Icons.Mail />,
  github: <Icons.GitHub />,
  google: <Icons.Google />,
};

function getProviderLabel(providerId: string): string {
  if (providerId === 'credential') return m['profile.provider.credential']();
  if (providerId === 'github') return m['profile.provider.github']();
  if (providerId === 'google') return m['profile.provider.google']();
  return providerId;
}

export function LinkedAccountsSection() {
  const { data: accounts } = useSuspenseQuery(linkedAccountQueries.list());
  const queryClient = useQueryClient();
  const router = useRouter();
  const [confirmProvider, setConfirmProvider] = useState<string | null>(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(
    null,
  );

  const canUnlink = accounts.length > 1;

  const handleUnlink = async (providerId: string) => {
    const label = getProviderLabel(providerId);
    setUnlinkingProvider(providerId);
    setConfirmProvider(null);

    try {
      const result = await authClient.unlinkAccount({ providerId });
      if (result.error) {
        clientLog.error({
          action: 'profile.unlink.failed',
          error: result.error.message,
        });
        toast.error(m['profile.toast.unlinkError']({ provider: label }), {
          description: result.error.message,
        });
        return;
      }

      // Post-unlink verification (Better Auth bug #1327)
      const fresh = await queryClient.fetchQuery({
        ...linkedAccountQueries.list(),
        staleTime: 0,
      });
      const stillPresent = fresh.some((a) => a.providerId === providerId);

      if (stillPresent) {
        toast.warning(m['profile.toast.unlinkVerifyFailed']());
        return;
      }

      toast.success(m['profile.toast.unlinkSuccess']({ provider: label }));
      void queryClient.invalidateQueries({
        queryKey: linkedAccountQueries.all(),
      });
      void router.invalidate();
    } catch (error) {
      const parsed = parseError(error);
      clientLog.error({
        action: 'profile.unlink.failed',
        error: parsed.message,
      });
      toast.error(m['profile.toast.unlinkError']({ provider: label }), {
        description: parsed.fix ?? parsed.why,
      });
    } finally {
      setUnlinkingProvider(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m['profile.connectedAccounts.title']()}</CardTitle>
        <CardDescription>
          {m['profile.connectedAccounts.description']()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {accounts.map((account) => {
            const isCredential = account.providerId === 'credential';
            const isUnlinking = unlinkingProvider === account.providerId;
            const isBusy = !!unlinkingProvider;
            const isDisabled = !canUnlink || isBusy;

            return (
              <li
                key={account.providerId}
                className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-5 items-center justify-center text-muted-foreground">
                    {providerIcons[account.providerId] ?? <Icons.User />}
                  </span>
                  <span className="text-sm">
                    {getProviderLabel(account.providerId)}
                  </span>
                </div>
                {!isCredential && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            aria-disabled={isDisabled}
                            className="aria-disabled:pointer-events-auto aria-disabled:opacity-50"
                            loading={isUnlinking}
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (isDisabled) return;
                              setConfirmProvider(account.providerId);
                            }}
                          />
                        }
                      >
                        {m['profile.unlink.action']()}
                      </TooltipTrigger>
                      {!canUnlink && (
                        <TooltipContent>
                          {m['profile.unlink.lastProvider']()}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>

      <AlertDialog
        open={!!confirmProvider}
        onOpenChange={(open) => {
          if (!open) setConfirmProvider(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmProvider &&
                m['profile.unlink.title']({
                  provider: getProviderLabel(confirmProvider),
                })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmProvider &&
                m['profile.unlink.description']({
                  provider: getProviderLabel(confirmProvider),
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m['actions.cancel']()}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirmProvider) void handleUnlink(confirmProvider);
              }}
            >
              {m['profile.unlink.action']()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
