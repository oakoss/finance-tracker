import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';

import type {
  CreateImportInput,
  DeleteImportInput,
} from '@/modules/imports/validators';

import { useAnalytics } from '@/hooks/use-analytics';
import { clientLog } from '@/lib/logging/client-logger';
import { parseError } from '@/lib/logging/evlog';
import { createImport } from '@/modules/imports/api/create-import';
import { deleteImport } from '@/modules/imports/api/delete-import';
import { listImports } from '@/modules/imports/api/list-imports';
import { m } from '@/paraglide/messages';

export const importQueries = {
  all: () => ['imports'] as const,
  list: () =>
    queryOptions({
      queryFn: () => listImports(),
      queryKey: [...importQueries.all(), 'list'],
    }),
};

export function useCreateImport() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: CreateImportInput) => createImport({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'import.create.failed', error });
      toast.error(m['imports.toast.createError'](), {
        description: parsed.fix ?? parsed.why,
      });
    },
    onSuccess: () => {
      toast.success(m['imports.toast.createSuccess']());
      void navigate({ search: {}, to: '/imports' });
      void queryClient.invalidateQueries({ queryKey: importQueries.all() });
      void router.invalidate();
    },
  });
}

export function useDeleteImport() {
  const queryClient = useQueryClient();
  const { capture } = useAnalytics();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: DeleteImportInput) => deleteImport({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'import.delete.failed', error });
      toast.error(m['imports.toast.deleteError'](), {
        description: parsed.fix ?? parsed.why,
      });
    },
    onSuccess: () => {
      toast.success(m['imports.toast.deleteSuccess']());
      void queryClient.invalidateQueries({ queryKey: importQueries.all() });
      void router.invalidate();
      capture('import_deleted');
    },
  });
}
