import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';

import type {
  CommitImportInput,
  CreateImportInput,
  DeleteImportInput,
  UpdateImportRowDataInput,
  UpdateImportRowStatusInput,
} from '@/modules/imports/validators';

import { useAnalytics } from '@/hooks/use-analytics';
import { clientLog } from '@/lib/logging/client-logger';
import { parseError } from '@/lib/logging/evlog';
import { commitImport } from '@/modules/imports/api/commit-import';
import { createImport } from '@/modules/imports/api/create-import';
import { deleteImport } from '@/modules/imports/api/delete-import';
import { listImportRows } from '@/modules/imports/api/list-import-rows';
import { listImports } from '@/modules/imports/api/list-imports';
import { updateImportRowData } from '@/modules/imports/api/update-import-row-data';
import { updateImportRowStatus } from '@/modules/imports/api/update-import-row-status';
import { m } from '@/paraglide/messages';

export const importQueries = {
  all: () => ['imports'] as const,
  detail: (importId: string) =>
    queryOptions({
      queryFn: () => listImportRows({ data: { importId } }),
      queryKey: [...importQueries.all(), 'detail', importId],
    }),
  list: () =>
    queryOptions({
      queryFn: () => listImports(),
      queryKey: [...importQueries.all(), 'list'],
    }),
};

export function useCreateImport() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { capture } = useAnalytics();
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
      capture('import_created');
    },
  });
}

export function useCommitImport() {
  const queryClient = useQueryClient();
  const { capture } = useAnalytics();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: CommitImportInput) => commitImport({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'import.commit.failed', error });
      toast.error(m['imports.toast.commitError'](), {
        description: parsed.fix ?? parsed.why,
      });
    },
    onSuccess: (result) => {
      toast.success(m['imports.toast.commitSuccess'](), {
        description: m['imports.toast.commitSuccessDescription']({
          count: result.committedCount,
        }),
      });
      void queryClient.invalidateQueries({ queryKey: importQueries.all() });
      void router.invalidate();
      capture('import_committed');
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

export function useUpdateImportRowStatus() {
  const queryClient = useQueryClient();
  const { capture } = useAnalytics();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: UpdateImportRowStatusInput) =>
      updateImportRowStatus({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'importRow.updateStatus.failed', error });
      toast.error(m['imports.detail.toast.statusError'](), {
        description: parsed.fix ?? parsed.why,
      });
    },
    onSuccess: () => {
      toast.success(m['imports.detail.toast.statusUpdated']());
      void queryClient.invalidateQueries({ queryKey: importQueries.all() });
      void router.invalidate();
      capture('import_row_status_updated');
    },
  });
}

export function useUpdateImportRowData() {
  const queryClient = useQueryClient();
  const { capture } = useAnalytics();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: UpdateImportRowDataInput) =>
      updateImportRowData({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'importRow.updateData.failed', error });
      toast.error(m['imports.detail.toast.dataError'](), {
        description: parsed.fix ?? parsed.why,
      });
    },
    onSuccess: () => {
      toast.success(m['imports.detail.toast.dataUpdated']());
      void queryClient.invalidateQueries({ queryKey: importQueries.all() });
      void router.invalidate();
      capture('import_row_data_updated');
    },
  });
}
