import { useState } from 'react';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { authClient } from '@/lib/auth-client';
import { clientLog } from '@/lib/logging/client-logger';
import { m } from '@/paraglide/messages';

type SocialProvider = 'github' | 'google';

type SocialSignInProps = {
  disabled?: boolean;
  onError: (message: string) => void;
};

function SocialSignIn({ disabled, onError }: SocialSignInProps) {
  const [loading, setLoading] = useState<SocialProvider | null>(null);

  const isDisabled = disabled === true || loading !== null;

  const handleSignIn = async (provider: SocialProvider) => {
    onError('');
    setLoading(provider);

    try {
      const result = await authClient.signIn.social({
        callbackURL: '/dashboard',
        provider,
      });

      if (result.error) {
        clientLog.error({
          action: `auth.social.${provider}`,
          error: result.error.message ?? 'Unknown social auth error',
          outcome: { success: false },
        });
        onError(result.error.message ?? m['auth.error.unexpected']());
        setLoading(null);
      }
    } catch (error) {
      clientLog.error({
        action: `auth.social.${provider}`,
        error: error instanceof Error ? error.message : String(error),
        outcome: { success: false },
      });
      onError(m['auth.error.unexpected']());
      setLoading(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">
          {m['auth.orContinueWith']()}
        </span>
        <Separator className="flex-1" />
      </div>

      <div className="grid gap-2">
        <Button
          className="w-full"
          disabled={isDisabled}
          loading={loading === 'github'}
          size="lg"
          variant="outline"
          onClick={() => void handleSignIn('github')}
        >
          <Icons.GitHub className="size-4" />
          {m['auth.social.continueWithGitHub']()}
        </Button>

        <Button
          className="w-full"
          disabled={isDisabled}
          loading={loading === 'google'}
          size="lg"
          variant="outline"
          onClick={() => void handleSignIn('google')}
        >
          <Icons.Google className="size-4" />
          {m['auth.social.continueWithGoogle']()}
        </Button>
      </div>
    </>
  );
}

export { SocialSignIn };
