import { useSuspenseQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { type } from 'arktype';

import { RootErrorBoundary } from '@/components/errors/root-error-boundary';
import { accountQueries } from '@/modules/accounts/hooks/use-accounts';
import { ImportUploadDialog } from '@/modules/imports/components/import-upload-dialog';
import { ImportsDataGrid } from '@/modules/imports/components/imports-data-grid';
import { ImportsEmpty } from '@/modules/imports/components/imports-empty';
import { ImportsPageHeader } from '@/modules/imports/components/imports-page-header';
import { importQueries } from '@/modules/imports/hooks/use-imports';

const searchSchema = type({ 'modal?': type.enumerated('upload') });

export const Route = createFileRoute('/_app/imports')({
  component: ImportsPage,
  errorComponent: ImportsError,
  validateSearch: (raw) => {
    const result = searchSchema(raw);
    if (result instanceof type.errors) return {};
    return result;
  },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(importQueries.list()),
      context.queryClient.ensureQueryData(accountQueries.list()),
    ]),
});

function ImportsPage() {
  const { data: imports } = useSuspenseQuery(importQueries.list());

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <ImportsPageHeader />
      {imports.length === 0 ? (
        <ImportsEmpty />
      ) : (
        <ImportsDataGrid data={imports} />
      )}
      <ImportUploadDialog />
    </div>
  );
}

function ImportsError(props: ErrorComponentProps) {
  return (
    <div className="flex flex-1 flex-col px-4 py-6 lg:px-6">
      <RootErrorBoundary {...props} />
    </div>
  );
}
