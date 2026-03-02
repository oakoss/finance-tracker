import { Button, Text } from '@react-email/components';

import { appConfig } from '@/configs/app';
import { m } from '@/paraglide/messages';
import { getLocale } from '@/paraglide/runtime';

import { BaseEmail } from './base-email';

type ResetPasswordEmailProps = {
  name?: string | null;
  url: string;
};

export function ResetPasswordEmail({ name, url }: ResetPasswordEmailProps) {
  const preview = m['email.resetPassword.preview']({
    appName: appConfig.name,
  });

  return (
    <BaseEmail lang={getLocale()} preview={preview}>
      <Text className="text-lg font-semibold tracking-tight text-foreground">
        {m['email.resetPassword.heading']()}
      </Text>
      <Text className="mt-4 text-base/relaxed text-muted-foreground">
        {name
          ? m['email.resetPassword.body']({ appName: appConfig.name, name })
          : m['email.resetPassword.bodyNoName']({
              appName: appConfig.name,
            })}
      </Text>
      <Button
        className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        href={url}
      >
        {m['email.resetPassword.button']()}
      </Button>
      <Text className="mt-6 text-xs text-muted-foreground">
        {m['email.common.pasteLink']({ url })}
      </Text>
    </BaseEmail>
  );
}
