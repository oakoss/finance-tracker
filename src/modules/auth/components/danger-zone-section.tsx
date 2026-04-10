import { useRouteContext } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDestructiveDialog } from '@/components/ui/confirm-destructive-dialog';
import { authClient } from '@/lib/auth/client';
import { clientLog } from '@/lib/logging/client-logger';
import { parseError } from '@/lib/logging/evlog';
import { m } from '@/paraglide/messages';

export function DangerZoneSection() {
  const { session } = useRouteContext({ from: '/_app' });
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const result = await authClient.deleteUser();
      if (result.error) {
        clientLog.error({
          action: 'profile.deleteAccount.failed',
          error: result.error.message,
        });
        toast.error(m['profile.deleteAccount.title'](), {
          description: result.error.message,
        });
        return;
      }
      toast.info(m['profile.deleteAccount.emailSent']());
    } catch (error) {
      const parsed = parseError(error);
      clientLog.error({
        action: 'profile.deleteAccount.failed',
        error: parsed.message,
      });
      toast.error(m['profile.deleteAccount.title'](), {
        description: parsed.fix ?? parsed.why,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="ring-destructive/30">
      <CardHeader>
        <CardTitle>{m['profile.dangerZone.title']()}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">
              {m['profile.deleteAccount.title']()}
            </p>
            <p className="text-sm text-muted-foreground">
              {m['profile.deleteAccount.description']()}
            </p>
          </div>
          <ConfirmDestructiveDialog
            confirmPhrase={session.user.email}
            description={m['profile.deleteAccount.confirmDescription']()}
            loading={isDeleting}
            title={m['profile.deleteAccount.title']()}
            trigger={
              <Button size="sm" variant="destructive">
                {m['profile.deleteAccount.title']()}
              </Button>
            }
            onConfirm={handleDeleteAccount}
          />
        </div>
      </CardContent>
    </Card>
  );
}
