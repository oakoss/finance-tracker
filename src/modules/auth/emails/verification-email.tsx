import { Button, Text } from '@react-email/components';

import { appConfig } from '@/configs/app';

import { BaseEmail } from './base-email';

type VerificationEmailProps = {
  name?: string | null;
  url: string;
};

export function VerificationEmail({ name, url }: VerificationEmailProps) {
  const preview = `Verify your ${appConfig.name} email`;

  return (
    <BaseEmail preview={preview}>
      <Text className="text-2xl font-semibold text-text">
        Verify your email
      </Text>
      <Text className="mt-4 text-base text-muted">
        {name ? `Hi ${name},` : 'Hi,'} please confirm your email address to
        start using {appConfig.name}.
      </Text>
      <Button
        className="mt-6 inline-block rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-slate-900"
        href={url}
      >
        Verify email
      </Button>
      <Text className="mt-6 text-xs text-muted">
        Or paste this link into your browser: {url}
      </Text>
    </BaseEmail>
  );
}
