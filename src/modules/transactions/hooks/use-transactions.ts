import { queryOptions } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import type {
  CreateTransactionInput,
  DeleteTransactionInput,
  SplitTransactionInput,
  UnsplitTransactionInput,
  UpdateSplitLinesInput,
  UpdateTransactionInput,
} from '@/modules/transactions/validators';

import { useAnalytics } from '@/hooks/use-analytics';
import { useResourceMutation } from '@/hooks/use-resource-mutation';
import { payeeQueries } from '@/modules/payees/hooks/use-payees';
import { createTransaction } from '@/modules/transactions/api/create-transaction';
import { deleteTransaction } from '@/modules/transactions/api/delete-transaction';
import { getTransactionById } from '@/modules/transactions/api/get-transaction-by-id';
import { listTags } from '@/modules/transactions/api/list-tags';
import { listTransactions } from '@/modules/transactions/api/list-transactions';
import { splitTransaction } from '@/modules/transactions/api/split-transaction';
import { unsplitTransaction } from '@/modules/transactions/api/unsplit-transaction';
import { updateSplitLines } from '@/modules/transactions/api/update-split-lines';
import { updateTransaction } from '@/modules/transactions/api/update-transaction';
import { m } from '@/paraglide/messages';

export const transactionQueries = {
  all: () => ['transactions'] as const,
  byId: (id: string) =>
    queryOptions({
      queryFn: () => getTransactionById({ data: { id } }),
      queryKey: [...transactionQueries.all(), 'byId', id],
    }),
  list: () =>
    queryOptions({
      queryFn: () => listTransactions(),
      queryKey: [...transactionQueries.all(), 'list'],
    }),
};

export const tagQueries = {
  all: () => ['tags'] as const,
  list: () =>
    queryOptions({
      queryFn: () => listTags(),
      queryKey: [...tagQueries.all(), 'list'],
    }),
};

export function useCreateTransaction() {
  const navigate = useNavigate();
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['transactions.toast.createError'],
    invalidate: [
      transactionQueries.all(),
      payeeQueries.all(),
      tagQueries.all(),
    ],
    mutationFn: (data: CreateTransactionInput) => createTransaction({ data }),
    mutationKey: ['transaction', 'create'],
    onSuccess: (_data, variables) => {
      void navigate({ search: {}, to: '/transactions' });
      capture('transaction_created', {
        direction: variables.direction,
        has_category: !!variables.categoryId,
        has_payee: !!(variables.payeeId ?? variables.newPayeeName),
        has_tags: !!(variables.tagIds?.length ?? variables.newTagNames?.length),
      });
    },
    successMessage: m['transactions.toast.createSuccess'],
  });
}

export function useUpdateTransaction() {
  const navigate = useNavigate();
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['transactions.toast.updateError'],
    invalidate: [
      transactionQueries.all(),
      payeeQueries.all(),
      tagQueries.all(),
    ],
    mutationFn: (data: UpdateTransactionInput) => updateTransaction({ data }),
    mutationKey: ['transaction', 'update'],
    onSuccess: (_data, variables) => {
      void navigate({ search: {}, to: '/transactions' });
      capture('transaction_updated', { direction: variables.direction });
    },
    successMessage: m['transactions.toast.updateSuccess'],
  });
}

export function useDeleteTransaction() {
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['transactions.toast.deleteError'],
    invalidate: [transactionQueries.all()],
    mutationFn: (data: DeleteTransactionInput) => deleteTransaction({ data }),
    mutationKey: ['transaction', 'delete'],
    onSuccess: () => {
      capture('transaction_deleted');
    },
    successMessage: m['transactions.toast.deleteSuccess'],
  });
}

export function useSplitTransaction() {
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['transactions.toast.splitError'],
    invalidate: [transactionQueries.all()],
    mutationFn: (data: SplitTransactionInput) => splitTransaction({ data }),
    mutationKey: ['transaction', 'split'],
    onSuccess: (_data, variables) => {
      capture('transaction_split', { line_count: variables.lines.length });
    },
    successMessage: m['transactions.toast.splitSuccess'],
  });
}

export function useUnsplitTransaction() {
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['transactions.toast.unsplitError'],
    invalidate: [transactionQueries.all()],
    mutationFn: (data: UnsplitTransactionInput) => unsplitTransaction({ data }),
    mutationKey: ['transaction', 'unsplit'],
    onSuccess: () => {
      capture('transaction_unsplit');
    },
    successMessage: m['transactions.toast.unsplitSuccess'],
  });
}

export function useUpdateSplitLines() {
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['transactions.toast.updateSplitLinesError'],
    invalidate: [transactionQueries.all()],
    mutationFn: (data: UpdateSplitLinesInput) => updateSplitLines({ data }),
    mutationKey: ['transaction', 'updateSplitLines'],
    onSuccess: (_data, variables) => {
      capture('transaction_split_lines_updated', {
        line_count: variables.lines.length,
      });
    },
    successMessage: m['transactions.toast.updateSplitLinesSuccess'],
  });
}
