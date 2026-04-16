import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { accountQueries } from '@/modules/accounts/hooks/use-accounts';
import { categoryQueries } from '@/modules/categories/hooks/use-categories';
import { payeeQueries } from '@/modules/payees/hooks/use-payees';
import {
  TransactionForm,
  type TransactionFormValues,
} from '@/modules/transactions/components/transaction-form';
import {
  tagQueries,
  useCreateTransaction,
} from '@/modules/transactions/hooks/use-transactions';
import { m } from '@/paraglide/messages';

export function CreateTransactionDialog() {
  const search = useSearch({ from: '/_app/transactions' });
  const navigate = useNavigate();
  const mutation = useCreateTransaction();
  const { data: accounts } = useSuspenseQuery(accountQueries.list());
  const { data: categories } = useSuspenseQuery(categoryQueries.list());
  const { data: payeesList } = useSuspenseQuery(payeeQueries.list());
  const { data: tagsList } = useSuspenseQuery(tagQueries.list());

  const open = search.modal === 'create';

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      void navigate({ search: {}, to: '/transactions' });
    }
  };

  const handleSubmit = (
    values: TransactionFormValues,
    payeeState: { newPayeeName?: string; payeeId?: string },
    tagState: { newTagNames: string[]; tagIds: string[] },
  ) => {
    mutation.mutate({
      accountId: values.accountId,
      amountCents: Math.round(Number.parseFloat(values.amount) * 100),
      ...(values.categoryId?.length ? { categoryId: values.categoryId } : {}),
      description: values.description,
      direction: values.direction,
      ...(values.memo?.length ? { memo: values.memo } : {}),
      ...(payeeState.newPayeeName
        ? { newPayeeName: payeeState.newPayeeName }
        : {}),
      ...(tagState.newTagNames.length > 0
        ? { newTagNames: tagState.newTagNames }
        : {}),
      ...(payeeState.payeeId ? { payeeId: payeeState.payeeId } : {}),
      ...(values.pending === undefined ? {} : { pending: values.pending }),
      ...(tagState.tagIds.length > 0 ? { tagIds: tagState.tagIds } : {}),
      transactionAt: values.transactionAt,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{m['transactions.create.title']()}</DialogTitle>
          <DialogDescription>
            {m['transactions.create.description']()}
          </DialogDescription>
        </DialogHeader>
        <TransactionForm
          key={open ? 'open' : 'closed'}
          accounts={accounts}
          categories={categories}
          isSubmitting={mutation.isPending}
          payees={payeesList}
          tags={tagsList}
          onSubmit={handleSubmit}
        />
        <DialogFooter>
          <Button
            disabled={mutation.isPending}
            variant="outline"
            onClick={() => void navigate({ search: {}, to: '/transactions' })}
          >
            {m['actions.cancel']()}
          </Button>
          <Button
            form="transaction-form"
            loading={mutation.isPending}
            type="submit"
          >
            {m['actions.create']()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
