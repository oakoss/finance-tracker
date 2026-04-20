import { Button, Text } from 'react-email';

import { appConfig } from '@/configs/app';
import { m } from '@/paraglide/messages';
import { getLocale } from '@/paraglide/runtime';

import { BaseEmail } from './base-email';

type DeletionScheduledEmailProps = {
  name?: string | null | undefined;
  profileUrl: string;
  purgeDate: string;
};

export function DeletionScheduledEmail({
  name,
  profileUrl,
  purgeDate,
}: DeletionScheduledEmailProps) {
  const preview = m['email.deletionScheduled.preview']({
    appName: appConfig.name,
  });

  return (
    <BaseEmail lang={getLocale()} preview={preview}>
      <Text className="text-lg font-semibold tracking-tight text-foreground">
        {m['email.deletionScheduled.heading']()}
      </Text>
      <Text className="mt-4 text-base/relaxed text-muted-foreground">
        {name
          ? m['email.deletionScheduled.body']({
              appName: appConfig.name,
              date: purgeDate,
              name,
            })
          : m['email.deletionScheduled.bodyNoName']({
              appName: appConfig.name,
              date: purgeDate,
            })}
      </Text>
      <Button
        className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        href={profileUrl}
      >
        {m['email.deletionScheduled.cancelButton']()}
      </Button>
    </BaseEmail>
  );
}
