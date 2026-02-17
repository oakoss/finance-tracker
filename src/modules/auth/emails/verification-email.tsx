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
      <Text className="text-lg font-semibold tracking-tight text-foreground">
        Verify your email
      </Text>
      <Text className="mt-4 text-base/relaxed text-muted-foreground">
        {name ? `Hi ${name},` : 'Hi,'} please confirm your email address to
        start using {appConfig.name}.
      </Text>
      <Button
        className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        href={url}
      >
        Verify email
      </Button>
      <Text className="mt-6 text-xs text-muted-foreground">
        Or paste this link into your browser: {url}
      </Text>
    </BaseEmail>
  );
}
