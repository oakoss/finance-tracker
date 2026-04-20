import { Text } from 'react-email';

import { appConfig } from '@/configs/app';
import { m } from '@/paraglide/messages';
import { getLocale } from '@/paraglide/runtime';

import { BaseEmail } from './base-email';

type DeletionCancelledEmailProps = { name?: string | null | undefined };

export function DeletionCancelledEmail({ name }: DeletionCancelledEmailProps) {
  const preview = m['email.deletionCancelled.preview']({
    appName: appConfig.name,
  });

  return (
    <BaseEmail lang={getLocale()} preview={preview}>
      <Text className="text-lg font-semibold tracking-tight text-foreground">
        {m['email.deletionCancelled.heading']()}
      </Text>
      <Text className="mt-4 text-base/relaxed text-muted-foreground">
        {name
          ? m['email.deletionCancelled.body']({ appName: appConfig.name, name })
          : m['email.deletionCancelled.bodyNoName']({
              appName: appConfig.name,
            })}
      </Text>
    </BaseEmail>
  );
}
