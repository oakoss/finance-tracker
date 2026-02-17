import { Button, Text } from '@react-email/components';

import { appConfig } from '@/configs/app';

import { BaseEmail } from './base-email';

type ResetPasswordEmailProps = {
  name?: string | null;
  url: string;
};

export function ResetPasswordEmail({ name, url }: ResetPasswordEmailProps) {
  const preview = `Reset your ${appConfig.name} password`;

  return (
    <BaseEmail preview={preview}>
      <Text className="text-lg font-semibold tracking-tight text-foreground">
        Reset password
      </Text>
      <Text className="mt-4 text-base/relaxed text-muted-foreground">
        {name ? `Hi ${name},` : 'Hi,'} we received a request to reset your
        {` ${appConfig.name}`} password.
      </Text>
      <Button
        className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        href={url}
      >
        Reset password
      </Button>
      <Text className="mt-6 text-xs text-muted-foreground">
        Or paste this link into your browser: {url}
      </Text>
    </BaseEmail>
  );
}
