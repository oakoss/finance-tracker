import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';

import { Icons } from '@/components/icons';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/i18n/date';
import { clientLog } from '@/lib/logging/client-logger';
import { parseError } from '@/lib/logging/evlog';
import { cancelAccountDeletion } from '@/modules/auth/api/cancel-account-deletion';
import { m } from '@/paraglide/messages';

type DeletionBannerProps = { purgeAfter: string };

export function DeletionBanner({ purgeAfter }: DeletionBannerProps) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);

  const date = formatDate({ value: new Date(purgeAfter) });

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelAccountDeletion({ data: undefined });
      toast.success(m['profile.gracePeriod.cancelSuccess']());
      void router.invalidate();
    } catch (error) {
      const parsed = parseError(error);
      clientLog.error({
        action: 'profile.gracePeriod.cancel.failed',
        error: parsed.message,
      });
      toast.error(m['profile.gracePeriod.cancelError'](), {
        description: parsed.fix ?? parsed.why,
      });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Alert className="mx-4 mt-2 lg:mx-6" variant="destructive">
      <Icons.TriangleAlert />
      <AlertTitle>{m['profile.gracePeriod.title']()}</AlertTitle>
      <AlertDescription>
        {m['profile.gracePeriod.description']({ date })}
      </AlertDescription>
      <AlertAction>
        <Button
          loading={cancelling}
          size="sm"
          variant="outline"
          onClick={() => void handleCancel()}
        >
          {m['profile.gracePeriod.cancel']()}
        </Button>
      </AlertAction>
    </Alert>
  );
}
