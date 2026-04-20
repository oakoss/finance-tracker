import { Text } from 'react-email';

import { appConfig } from '@/configs/app';
import { m } from '@/paraglide/messages';
import { getLocale } from '@/paraglide/runtime';

import { BaseEmail } from './base-email';

type DeletionCompleteEmailProps = { name?: string | null | undefined };

export function DeletionCompleteEmail({ name }: DeletionCompleteEmailProps) {
  const preview = m['email.deletionComplete.preview']({
    appName: appConfig.name,
  });

  return (
    <BaseEmail lang={getLocale()} preview={preview}>
      <Text className="text-lg font-semibold tracking-tight text-foreground">
        {m['email.deletionComplete.heading']()}
      </Text>
      <Text className="mt-4 text-base/relaxed text-muted-foreground">
        {name
          ? m['email.deletionComplete.body']({ appName: appConfig.name, name })
          : m['email.deletionComplete.bodyNoName']({ appName: appConfig.name })}
      </Text>
    </BaseEmail>
  );
}
