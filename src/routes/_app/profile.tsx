import { useSuspenseQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  type ErrorComponentProps,
} from '@tanstack/react-router';

import { RootErrorBoundary } from '@/components/errors/root-error-boundary';
import { DangerZoneSection } from '@/modules/auth/components/danger-zone-section';
import { LinkedAccountsSection } from '@/modules/auth/components/linked-accounts-section';
import { ProfileEmailSection } from '@/modules/auth/components/profile-email-section';
import { ProfileInfoSection } from '@/modules/auth/components/profile-info-section';
import { ProfileNameForm } from '@/modules/auth/components/profile-name-form';
import { ProfilePasswordSection } from '@/modules/auth/components/profile-password-section';
import { linkedAccountQueries } from '@/modules/auth/hooks/use-linked-accounts';
import { DataExportSection } from '@/modules/export/components/data-export-section';
import { m } from '@/paraglide/messages';

export const Route = createFileRoute('/_app/profile')({
  component: ProfilePage,
  errorComponent: ProfileError,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(linkedAccountQueries.list()),
});

function ProfilePage() {
  const { data: accounts } = useSuspenseQuery(linkedAccountQueries.list());
  const hasPassword = accounts.some((a) => a.providerId === 'credential');

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {m['profile.title']()}
      </h1>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <ProfileInfoSection />
        <ProfileNameForm />
        <ProfileEmailSection />
        {hasPassword && <ProfilePasswordSection />}
        <LinkedAccountsSection />
        <DataExportSection />
        <DangerZoneSection />
      </div>
    </div>
  );
}

function ProfileError(props: ErrorComponentProps) {
  return (
    <div className="flex flex-1 flex-col px-4 py-6 lg:px-6">
      <RootErrorBoundary {...props} />
    </div>
  );
}
