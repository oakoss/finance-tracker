import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';

import type {
  CreateAccountInput,
  DeleteAccountInput,
  UpdateAccountInput,
} from '@/modules/accounts/types';

import { clientLog } from '@/lib/logging/client-logger';
import { parseError } from '@/lib/logging/evlog';
import { createAccount } from '@/modules/accounts/api/create-account';
import { deleteAccount } from '@/modules/accounts/api/delete-account';
import { listAccounts } from '@/modules/accounts/api/list-accounts';
import { updateAccount } from '@/modules/accounts/api/update-account';
import { m } from '@/paraglide/messages';

export const accountQueries = {
  all: () => ['accounts'] as const,
  list: () =>
    queryOptions({
      queryFn: () => listAccounts(),
      queryKey: [...accountQueries.all(), 'list'],
    }),
};

export function useCreateAccount() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: CreateAccountInput) => createAccount({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'account.create.failed', error });
      toast.error(m['accounts.toast.createError'](), {
        description: parsed.fix ?? parsed.why,
      });
    },
    onSuccess: () => {
      toast.success(m['accounts.toast.createSuccess']());
      void navigate({ search: {}, to: '/accounts' });
      void queryClient.invalidateQueries({ queryKey: accountQueries.all() });
      void router.invalidate();
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: UpdateAccountInput) => updateAccount({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'account.update.failed', error });
      toast.error(m['accounts.toast.updateError'](), {
        description: parsed.fix ?? parsed.why,
      });
    },
    onSuccess: () => {
      toast.success(m['accounts.toast.updateSuccess']());
      void navigate({ search: {}, to: '/accounts' });
      void queryClient.invalidateQueries({ queryKey: accountQueries.all() });
      void router.invalidate();
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: DeleteAccountInput) => deleteAccount({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'account.delete.failed', error });
      toast.error(m['accounts.toast.deleteError'](), {
        description: parsed.fix ?? parsed.why,
      });
    },
    onSuccess: () => {
      toast.success(m['accounts.toast.deleteSuccess']());
      void queryClient.invalidateQueries({ queryKey: accountQueries.all() });
      void router.invalidate();
    },
  });
}
