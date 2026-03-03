import { useSuspenseQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { type } from 'arktype';

import { RootErrorBoundary } from '@/components/errors/root-error-boundary';
import { accountQueries } from '@/modules/accounts/hooks/use-accounts';
import { categoryQueries } from '@/modules/categories/hooks/use-categories';
import { CreateTransactionDialog } from '@/modules/transactions/components/create-transaction-dialog';
import { EditTransactionDialog } from '@/modules/transactions/components/edit-transaction-dialog';
import { TransactionsDataGrid } from '@/modules/transactions/components/transactions-data-grid';
import { TransactionsEmpty } from '@/modules/transactions/components/transactions-empty';
import { TransactionsPageHeader } from '@/modules/transactions/components/transactions-page-header';
import {
  payeeQueries,
  tagQueries,
  transactionQueries,
} from '@/modules/transactions/hooks/use-transactions';

const searchSchema = type({
  'edit?': 'string',
  'modal?': type.enumerated('create'),
});

export const Route = createFileRoute('/_app/transactions')({
  component: TransactionsPage,
  errorComponent: TransactionsError,
  validateSearch: (raw) => {
    const result = searchSchema(raw);
    if (result instanceof type.errors) return {};
    return result;
  },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(transactionQueries.list()),
      context.queryClient.ensureQueryData(accountQueries.list()),
      context.queryClient.ensureQueryData(categoryQueries.list()),
      context.queryClient.ensureQueryData(payeeQueries.list()),
      context.queryClient.ensureQueryData(tagQueries.list()),
    ]),
});

function TransactionsPage() {
  const { data: transactions } = useSuspenseQuery(transactionQueries.list());

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <TransactionsPageHeader />
      {transactions.length === 0 ? (
        <TransactionsEmpty />
      ) : (
        <TransactionsDataGrid data={transactions} />
      )}
      <CreateTransactionDialog />
      <EditTransactionDialog transactions={transactions} />
    </div>
  );
}

function TransactionsError(props: ErrorComponentProps) {
  return (
    <div className="flex flex-1 flex-col px-4 py-6 lg:px-6">
      <RootErrorBoundary {...props} />
    </div>
  );
}
