import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useMemo } from 'react';

import type { TransactionListItem } from '@/modules/transactions/api/list-transactions';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toISODateString } from '@/lib/i18n/date';
import { accountQueries } from '@/modules/accounts/hooks/use-accounts';
import { categoryQueries } from '@/modules/categories/hooks/use-categories';
import {
  TransactionForm,
  type TransactionFormValues,
} from '@/modules/transactions/components/transaction-form';
import {
  payeeQueries,
  tagQueries,
  useUpdateTransaction,
} from '@/modules/transactions/hooks/use-transactions';
import { m } from '@/paraglide/messages';

type EditTransactionDialogProps = { transactions: TransactionListItem[] };

export function EditTransactionDialog({
  transactions,
}: EditTransactionDialogProps) {
  const search = useSearch({ from: '/_app/transactions' });
  const navigate = useNavigate();
  const mutation = useUpdateTransaction();
  const { data: accounts } = useSuspenseQuery(accountQueries.list());
  const { data: categories } = useSuspenseQuery(categoryQueries.list());
  const { data: payeesList } = useSuspenseQuery(payeeQueries.list());
  const { data: tagsList } = useSuspenseQuery(tagQueries.list());

  const editId = search.edit;
  const open = !!editId;

  const item = useMemo(
    () => transactions.find((t) => t.id === editId),
    [transactions, editId],
  );

  const defaultValues = useMemo<
    | (Partial<TransactionFormValues> & { payeeId?: string; tagIds?: string[] })
    | undefined
  >(() => {
    if (!item) return;
    const dateStr = toISODateString(new Date(item.transactionAt));
    return {
      accountId: item.accountId,
      amount: (item.amountCents / 100).toFixed(2),
      ...(item.categoryId ? { categoryId: item.categoryId } : {}),
      description: item.description,
      direction: item.direction ?? 'debit',
      memo: item.memo ?? '',
      ...(item.payeeId ? { payeeId: item.payeeId } : {}),
      pending: item.pending,
      tagIds: item.tags?.map((t) => t.id) ?? [],
      transactionAt: dateStr,
    };
  }, [item]);

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
    if (!editId) return;
    mutation.mutate({
      accountId: values.accountId,
      amountCents: Math.round(Number.parseFloat(values.amount) * 100),
      categoryId: values.categoryId?.length ? values.categoryId : null,
      description: values.description,
      direction: values.direction,
      id: editId,
      memo: values.memo?.length ? values.memo : null,
      ...(payeeState.newPayeeName
        ? { newPayeeName: payeeState.newPayeeName }
        : {}),
      ...(tagState.newTagNames.length > 0
        ? { newTagNames: tagState.newTagNames }
        : {}),
      payeeId: payeeState.payeeId ?? null,
      ...(values.pending === undefined ? {} : { pending: values.pending }),
      tagIds: tagState.tagIds,
      transactionAt: values.transactionAt,
    });
  };

  if (!open || !defaultValues) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{m['transactions.edit.title']()}</DialogTitle>
          <DialogDescription>
            {m['transactions.edit.description']()}
          </DialogDescription>
        </DialogHeader>
        <TransactionForm
          key={editId}
          accounts={accounts}
          categories={categories}
          defaultValues={defaultValues}
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
            {m['actions.save']()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
