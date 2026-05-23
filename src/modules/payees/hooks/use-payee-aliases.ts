import { queryOptions } from '@tanstack/react-query';

import type {
  CreatePayeeAliasInput,
  DeletePayeeAliasInput,
} from '@/modules/payees/validators';

import { useResourceMutation } from '@/hooks/use-resource-mutation';
import { createPayeeAlias } from '@/modules/payees/api/create-payee-alias';
import { deletePayeeAlias } from '@/modules/payees/api/delete-payee-alias';
import { listPayeeAliases } from '@/modules/payees/api/list-payee-aliases';
import { m } from '@/paraglide/messages';

export const payeeAliasQueries = {
  all: () => ['payeeAliases'] as const,
  list: (payeeId: string) =>
    queryOptions({
      queryFn: () => listPayeeAliases({ data: { payeeId } }),
      queryKey: [...payeeAliasQueries.all(), 'list', payeeId],
    }),
};

export function useCreatePayeeAlias() {
  return useResourceMutation({
    errorMessage: m['rules.aliases.toast.createError'],
    invalidate: [payeeAliasQueries.all()],
    mutationFn: (data: CreatePayeeAliasInput) => createPayeeAlias({ data }),
    mutationKey: ['payeeAlias', 'create'],
    successMessage: m['rules.aliases.toast.createSuccess'],
  });
}

export function useDeletePayeeAlias() {
  return useResourceMutation({
    errorMessage: m['rules.aliases.toast.deleteError'],
    invalidate: [payeeAliasQueries.all()],
    mutationFn: (data: DeletePayeeAliasInput) => deletePayeeAlias({ data }),
    mutationKey: ['payeeAlias', 'delete'],
    successMessage: m['rules.aliases.toast.deleteSuccess'],
  });
}
