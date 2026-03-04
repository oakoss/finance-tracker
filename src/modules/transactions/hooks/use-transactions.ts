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
  UpdateTransactionInput,
} from '@/modules/transactions/validators';

import { clientLog } from '@/lib/logging/client-logger';
import { parseError } from '@/lib/logging/evlog';
import { createTransaction } from '@/modules/transactions/api/create-transaction';
import { deleteTransaction } from '@/modules/transactions/api/delete-transaction';
import { listPayees } from '@/modules/transactions/api/list-payees';
import { listTags } from '@/modules/transactions/api/list-tags';
import { listTransactions } from '@/modules/transactions/api/list-transactions';
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

export const payeeQueries = {
  all: () => ['payees'] as const,
  list: () =>
    queryOptions({
      queryFn: () => listPayees(),
      queryKey: [...payeeQueries.all(), 'list'],
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
    onSuccess: () => {
      toast.success(m['transactions.toast.createSuccess']());
      void navigate({ search: {}, to: '/transactions' });
      void queryClient.invalidateQueries({
        queryKey: transactionQueries.all(),
      });
      void queryClient.invalidateQueries({
        queryKey: payeeQueries.all(),
      });
      void queryClient.invalidateQueries({
        queryKey: tagQueries.all(),
      });
      void router.invalidate();
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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
    onSuccess: () => {
      toast.success(m['transactions.toast.updateSuccess']());
      void navigate({ search: {}, to: '/transactions' });
      void queryClient.invalidateQueries({
        queryKey: transactionQueries.all(),
      });
      void queryClient.invalidateQueries({
        queryKey: payeeQueries.all(),
      });
      void queryClient.invalidateQueries({
        queryKey: tagQueries.all(),
      });
      void router.invalidate();
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
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
    },
  });
}
