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
      <Text className="text-2xl font-semibold text-text">Reset password</Text>
      <Text className="mt-4 text-base text-muted">
        {name ? `Hi ${name},` : 'Hi,'} we received a request to reset your
        {` ${appConfig.name}`} password.
      </Text>
      <Button
        className="mt-6 inline-block rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-slate-900"
        href={url}
      >
        Reset password
      </Button>
      <Text className="mt-6 text-xs text-muted">
        Or paste this link into your browser: {url}
      </Text>
    </BaseEmail>
  );
}
