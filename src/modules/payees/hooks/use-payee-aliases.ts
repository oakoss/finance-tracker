import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';

import type {
  CreatePayeeAliasInput,
  DeletePayeeAliasInput,
} from '@/modules/payees/validators';

import { clientLog } from '@/lib/logging/client-logger';
import { parseError } from '@/lib/logging/evlog';
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

function useInvalidate() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return () => {
    void queryClient.invalidateQueries({ queryKey: payeeAliasQueries.all() });
    void router.invalidate();
  };
}

export function useCreatePayeeAlias() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (data: CreatePayeeAliasInput) => createPayeeAlias({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'payeeAlias.create.failed', error });
      toast.error(m['rules.aliases.toast.createError'](), {
        description: parsed.fix ?? parsed.why ?? m['auth.error.unexpected'](),
      });
    },
    onSuccess: () => {
      toast.success(m['rules.aliases.toast.createSuccess']());
      invalidate();
    },
  });
}

export function useDeletePayeeAlias() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (data: DeletePayeeAliasInput) => deletePayeeAlias({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'payeeAlias.delete.failed', error });
      toast.error(m['rules.aliases.toast.deleteError'](), {
        description: parsed.fix ?? parsed.why ?? m['auth.error.unexpected'](),
      });
    },
    onSuccess: () => {
      toast.success(m['rules.aliases.toast.deleteSuccess']());
      invalidate();
    },
  });
}
