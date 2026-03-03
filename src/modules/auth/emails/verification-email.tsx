import { Button, Text } from '@react-email/components';

import { appConfig } from '@/configs/app';
import { m } from '@/paraglide/messages';
import { getLocale } from '@/paraglide/runtime';

import { BaseEmail } from './base-email';

type VerificationEmailProps = {
  name?: string | null | undefined;
  url: string;
};

export function VerificationEmail({ name, url }: VerificationEmailProps) {
  const preview = m['email.verification.preview']({
    appName: appConfig.name,
  });

  return (
    <BaseEmail lang={getLocale()} preview={preview}>
      <Text className="text-lg font-semibold tracking-tight text-foreground">
        {m['email.verification.heading']()}
      </Text>
      <Text className="mt-4 text-base/relaxed text-muted-foreground">
        {name
          ? m['email.verification.body']({ appName: appConfig.name, name })
          : m['email.verification.bodyNoName']({ appName: appConfig.name })}
      </Text>
      <Button
        className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        href={url}
      >
        {m['email.verification.button']()}
      </Button>
      <Text className="mt-6 text-xs text-muted-foreground">
        {m['email.common.pasteLink']({ url })}
      </Text>
    </BaseEmail>
  );
}
