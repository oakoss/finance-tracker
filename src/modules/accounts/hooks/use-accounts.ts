import { queryOptions } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import type {
  CreateAccountInput,
  DeleteAccountInput,
  UpdateAccountInput,
} from '@/modules/accounts/validators';

import { useAnalytics } from '@/hooks/use-analytics';
import { useResourceMutation } from '@/hooks/use-resource-mutation';
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
  const navigate = useNavigate();
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['accounts.toast.createError'],
    invalidate: [accountQueries.all()],
    mutationFn: (data: CreateAccountInput) => createAccount({ data }),
    mutationKey: ['account', 'create'],
    onSuccess: (_data, variables) => {
      void navigate({ search: {}, to: '/accounts' });
      capture('account_created', {
        currency: variables.currency,
        owner_type: variables.ownerType,
        type: variables.type,
      });
    },
    successMessage: m['accounts.toast.createSuccess'],
  });
}

export function useUpdateAccount() {
  const navigate = useNavigate();
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['accounts.toast.updateError'],
    invalidate: [accountQueries.all()],
    mutationFn: (data: UpdateAccountInput) => updateAccount({ data }),
    mutationKey: ['account', 'update'],
    onSuccess: (_data, variables) => {
      void navigate({ search: {}, to: '/accounts' });
      capture('account_updated', { type: variables.type });
    },
    successMessage: m['accounts.toast.updateSuccess'],
  });
}

export function useDeleteAccount() {
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['accounts.toast.deleteError'],
    invalidate: [accountQueries.all()],
    mutationFn: (data: DeleteAccountInput) => deleteAccount({ data }),
    mutationKey: ['account', 'delete'],
    onSuccess: () => {
      capture('account_deleted');
    },
    successMessage: m['accounts.toast.deleteSuccess'],
  });
}
