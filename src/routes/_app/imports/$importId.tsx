import { useSuspenseQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  type ErrorComponentProps,
} from '@tanstack/react-router';

import { RootErrorBoundary } from '@/components/errors/root-error-boundary';
import { ImportDetailActions } from '@/modules/imports/components/import-detail-actions';
import { ImportDetailHeader } from '@/modules/imports/components/import-detail-header';
import { ImportDetailSummary } from '@/modules/imports/components/import-detail-summary';
import { ImportRowsDataGrid } from '@/modules/imports/components/import-rows-data-grid';
import { importQueries } from '@/modules/imports/hooks/use-imports';
import { m } from '@/paraglide/messages';

export const Route = createFileRoute('/_app/imports/$importId')({
  component: ImportDetailPage,
  errorComponent: ImportDetailError,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(importQueries.detail(params.importId)),
});

function ImportDetailPage() {
  const { importId } = Route.useParams();
  const { data } = useSuspenseQuery(importQueries.detail(importId));

  if (!data) return null;

  const mappedCount = data.rows.filter((r) => r.status === 'mapped').length;

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <ImportDetailHeader import={data.import} />
      <div className="flex items-center justify-between">
        <ImportDetailSummary rows={data.rows} />
        <ImportDetailActions
          importId={importId}
          importStatus={data.import.status}
          mappedCount={mappedCount}
        />
      </div>
      {data.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {m['imports.detail.empty']()}
        </p>
      ) : (
        <ImportRowsDataGrid data={data.rows} />
      )}
    </div>
  );
}

function ImportDetailError(props: ErrorComponentProps) {
  return (
    <div className="flex flex-1 flex-col px-4 py-6 lg:px-6">
      <RootErrorBoundary {...props} />
    </div>
  );
}
