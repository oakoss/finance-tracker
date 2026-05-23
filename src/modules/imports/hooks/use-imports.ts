import { queryOptions } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import type {
  CommitImportInput,
  CreateImportInput,
  DeleteImportInput,
  UpdateImportRowDataInput,
  UpdateImportRowStatusInput,
} from '@/modules/imports/validators';

import { useAnalytics } from '@/hooks/use-analytics';
import { useResourceMutation } from '@/hooks/use-resource-mutation';
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
  const navigate = useNavigate();
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['imports.toast.createError'],
    invalidate: [importQueries.all()],
    mutationFn: (data: CreateImportInput) => createImport({ data }),
    mutationKey: ['import', 'create'],
    onSuccess: () => {
      void navigate({ search: {}, to: '/imports' });
      capture('import_created');
    },
    successMessage: m['imports.toast.createSuccess'],
    successToastOptions: (result) => ({
      action: {
        label: m['imports.detail.review'](),
        onClick: () =>
          void navigate({
            params: { importId: result.id },
            to: '/imports/$importId',
          }),
      },
    }),
  });
}

export function useCommitImport() {
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['imports.toast.commitError'],
    invalidate: [importQueries.all()],
    mutationFn: (data: CommitImportInput) => commitImport({ data }),
    mutationKey: ['import', 'commit'],
    onSuccess: () => {
      capture('import_committed');
    },
    successMessage: m['imports.toast.commitSuccess'],
    successToastOptions: (result) => ({
      description: m['imports.toast.commitSuccessDescription']({
        count: result.committedCount,
      }),
    }),
  });
}

export function useDeleteImport() {
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['imports.toast.deleteError'],
    invalidate: [importQueries.all()],
    mutationFn: (data: DeleteImportInput) => deleteImport({ data }),
    mutationKey: ['import', 'delete'],
    onSuccess: () => {
      capture('import_deleted');
    },
    successMessage: m['imports.toast.deleteSuccess'],
  });
}

export function useUpdateImportRowStatus() {
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['imports.detail.toast.statusError'],
    invalidate: [importQueries.all()],
    mutationFn: (data: UpdateImportRowStatusInput) =>
      updateImportRowStatus({ data }),
    mutationKey: ['importRow', 'updateStatus'],
    onSuccess: () => {
      capture('import_row_status_updated');
    },
    successMessage: m['imports.detail.toast.statusUpdated'],
  });
}

export function useUpdateImportRowData() {
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['imports.detail.toast.dataError'],
    invalidate: [importQueries.all()],
    mutationFn: (data: UpdateImportRowDataInput) =>
      updateImportRowData({ data }),
    mutationKey: ['importRow', 'updateData'],
    onSuccess: () => {
      capture('import_row_data_updated');
    },
    successMessage: m['imports.detail.toast.dataUpdated'],
  });
}
