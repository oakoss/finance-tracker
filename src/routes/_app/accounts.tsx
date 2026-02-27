import { useSuspenseQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { type } from 'arktype';

import { RootErrorBoundary } from '@/components/errors/root-error-boundary';
import { AccountsDataGrid } from '@/modules/accounts/components/accounts-data-grid';
import { AccountsEmpty } from '@/modules/accounts/components/accounts-empty';
import { AccountsPageHeader } from '@/modules/accounts/components/accounts-page-header';
import { CreateAccountDialog } from '@/modules/accounts/components/create-account-dialog';
import { EditAccountDialog } from '@/modules/accounts/components/edit-account-dialog';
import { accountQueries } from '@/modules/accounts/hooks/use-accounts';

const searchSchema = type({
  'edit?': 'string',
  'modal?': type.enumerated('create'),
});

export const Route = createFileRoute('/_app/accounts')({
  component: AccountsPage,
  errorComponent: AccountsError,
  validateSearch: (raw) => {
    const result = searchSchema(raw);
    if (result instanceof type.errors) return {};
    return result;
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(accountQueries.list()),
});

function AccountsPage() {
  const { data: accounts } = useSuspenseQuery(accountQueries.list());

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <AccountsPageHeader />
      {accounts.length === 0 ? (
        <AccountsEmpty />
      ) : (
        <AccountsDataGrid data={accounts} />
      )}
      <CreateAccountDialog />
      <EditAccountDialog accounts={accounts} />
    </div>
  );
}

function AccountsError(props: ErrorComponentProps) {
  return (
    <div className="flex flex-1 flex-col px-4 py-6 lg:px-6">
      <RootErrorBoundary {...props} />
    </div>
  );
}
