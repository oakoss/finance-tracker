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
import { authClient } from '@/lib/auth/client';
import { clientLog } from '@/lib/logging/client-logger';
import { parseError } from '@/lib/logging/evlog';
import { m } from '@/paraglide/messages';

type VerificationBannerProps = { email: string };

export function VerificationBanner({ email }: VerificationBannerProps) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleResend = async () => {
    setSending(true);
    try {
      const result = await authClient.sendVerificationEmail({
        callbackURL: '/dashboard',
        email,
      });
      if (result.error) {
        clientLog.error({
          action: 'auth.verification.resend.failed',
          error: result.error.message,
        });
        toast.error(m['auth.verification.resendError'](), {
          description: result.error.message,
        });
        return;
      }
      toast.success(m['auth.verification.resendSuccess']());
      // No invalidate here — resend doesn't change session state.
      // The "I've verified" button handles refresh via handleRefresh.
    } catch (error) {
      const parsed = parseError(error);
      clientLog.error({
        action: 'auth.verification.resend.failed',
        error: parsed.message,
      });
      toast.error(m['auth.verification.resendError'](), {
        description: parsed.fix ?? parsed.why,
      });
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await router.invalidate();
    } catch (error) {
      const parsed = parseError(error);
      clientLog.error({
        action: 'auth.verification.refresh.failed',
        error: parsed.message,
      });
      toast.error(m['auth.verification.refreshError'](), {
        description: parsed.fix ?? parsed.why,
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Alert className="mx-4 mt-2 lg:mx-6" variant="warning">
      <Icons.Mail />
      <AlertTitle>{m['auth.verification.bannerTitle']()}</AlertTitle>
      <AlertDescription>
        {m['auth.verification.bannerDescription']({ email })}
      </AlertDescription>
      <AlertAction>
        <Button
          loading={refreshing}
          size="sm"
          variant="outline"
          onClick={() => void handleRefresh()}
        >
          {m['auth.verification.checkAgain']()}
        </Button>
        <Button loading={sending} size="sm" onClick={() => void handleResend()}>
          {m['auth.verification.resend']()}
        </Button>
      </AlertAction>
    </Alert>
  );
}
