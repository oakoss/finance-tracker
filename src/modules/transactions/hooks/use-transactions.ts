import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';

import type {
  CreateTransactionInput,
  DeleteTransactionInput,
  SplitTransactionInput,
  UnsplitTransactionInput,
  UpdateSplitLinesInput,
  UpdateTransactionInput,
} from '@/modules/transactions/validators';

import { useAnalytics } from '@/hooks/use-analytics';
import { clientLog } from '@/lib/logging/client-logger';
import { parseError } from '@/lib/logging/evlog';
import { payeeQueries } from '@/modules/payees/hooks/use-payees';
import { createTransaction } from '@/modules/transactions/api/create-transaction';
import { deleteTransaction } from '@/modules/transactions/api/delete-transaction';
import { listTags } from '@/modules/transactions/api/list-tags';
import { listTransactions } from '@/modules/transactions/api/list-transactions';
import { splitTransaction } from '@/modules/transactions/api/split-transaction';
import { unsplitTransaction } from '@/modules/transactions/api/unsplit-transaction';
import { updateSplitLines } from '@/modules/transactions/api/update-split-lines';
import { updateTransaction } from '@/modules/transactions/api/update-transaction';
import { m } from '@/paraglide/messages';

export const transactionQueries = {
  all: () => ['transactions'] as const,
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
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { capture } = useAnalytics();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: CreateTransactionInput) => createTransaction({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'transaction.create.failed', error });
      toast.error(m['transactions.toast.createError'](), {
        description: parsed.fix ?? parsed.why,
      });
    },
    onSuccess: (_data, variables) => {
      toast.success(m['transactions.toast.createSuccess']());
      void navigate({ search: {}, to: '/transactions' });
      void queryClient.invalidateQueries({
        queryKey: transactionQueries.all(),
      });
      void queryClient.invalidateQueries({ queryKey: payeeQueries.all() });
      void queryClient.invalidateQueries({ queryKey: tagQueries.all() });
      void router.invalidate();
      capture('transaction_created', {
        direction: variables.direction,
        has_category: !!variables.categoryId,
        has_payee: !!(variables.payeeId ?? variables.newPayeeName),
        has_tags: !!(variables.tagIds?.length ?? variables.newTagNames?.length),
      });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { capture } = useAnalytics();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: UpdateTransactionInput) => updateTransaction({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'transaction.update.failed', error });
      toast.error(m['transactions.toast.updateError'](), {
        description: parsed.fix ?? parsed.why,
      });
    },
    onSuccess: (_data, variables) => {
      toast.success(m['transactions.toast.updateSuccess']());
      void navigate({ search: {}, to: '/transactions' });
      void queryClient.invalidateQueries({
        queryKey: transactionQueries.all(),
      });
      void queryClient.invalidateQueries({ queryKey: payeeQueries.all() });
      void queryClient.invalidateQueries({ queryKey: tagQueries.all() });
      void router.invalidate();
      capture('transaction_updated', { direction: variables.direction });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const { capture } = useAnalytics();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: DeleteTransactionInput) => deleteTransaction({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'transaction.delete.failed', error });
      toast.error(m['transactions.toast.deleteError'](), {
        description: parsed.fix ?? parsed.why,
      });
    },
    onSuccess: () => {
      toast.success(m['transactions.toast.deleteSuccess']());
      void queryClient.invalidateQueries({
        queryKey: transactionQueries.all(),
      });
      void router.invalidate();
      capture('transaction_deleted');
    },
  });
}

export function useSplitTransaction() {
  const queryClient = useQueryClient();
  const { capture } = useAnalytics();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: SplitTransactionInput) => splitTransaction({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'transaction.split.failed', error });
      toast.error(m['transactions.toast.splitError'](), {
        description: parsed.fix ?? parsed.why,
      });
    },
    onSuccess: (_data, variables) => {
      toast.success(m['transactions.toast.splitSuccess']());
      void queryClient.invalidateQueries({
        queryKey: transactionQueries.all(),
      });
      void router.invalidate();
      capture('transaction_split', { line_count: variables.lines.length });
    },
  });
}

export function useUnsplitTransaction() {
  const queryClient = useQueryClient();
  const { capture } = useAnalytics();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: UnsplitTransactionInput) => unsplitTransaction({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'transaction.unsplit.failed', error });
      toast.error(m['transactions.toast.unsplitError'](), {
        description: parsed.fix ?? parsed.why,
      });
    },
    onSuccess: () => {
      toast.success(m['transactions.toast.unsplitSuccess']());
      void queryClient.invalidateQueries({
        queryKey: transactionQueries.all(),
      });
      void router.invalidate();
      capture('transaction_unsplit');
    },
  });
}

export function useUpdateSplitLines() {
  const queryClient = useQueryClient();
  const { capture } = useAnalytics();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: UpdateSplitLinesInput) => updateSplitLines({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'transaction.updateSplitLines.failed', error });
      toast.error(m['transactions.toast.updateSplitLinesError'](), {
        description: parsed.fix ?? parsed.why,
      });
    },
    onSuccess: (_data, variables) => {
      toast.success(m['transactions.toast.updateSplitLinesSuccess']());
      void queryClient.invalidateQueries({
        queryKey: transactionQueries.all(),
      });
      void router.invalidate();
      capture('transaction_split_lines_updated', {
        line_count: variables.lines.length,
      });
    },
  });
}
