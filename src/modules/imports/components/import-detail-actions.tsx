import type { ImportDetailResult } from '@/modules/imports/api/list-import-rows';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useCommitImport } from '@/modules/imports/hooks/use-imports';
import { m } from '@/paraglide/messages';

type ImportDetailActionsProps = {
  importId: string;
  importStatus: ImportDetailResult['import']['status'];
  mappedCount: number;
};

export function ImportDetailActions({
  importId,
  importStatus,
  mappedCount,
}: ImportDetailActionsProps) {
  const mutation = useCommitImport();
  const canCommit = importStatus === 'completed' && mappedCount > 0;

  return (
    <div className="flex items-center gap-3">
      <Button
        disabled={!canCommit || mutation.isPending}
        onClick={() => mutation.mutate({ importId })}
      >
        {mutation.isPending && (
          <Icons.Loader2 className="size-4 animate-spin" />
        )}
        {m['imports.detail.commitButton']()}
      </Button>
    </div>
  );
}
