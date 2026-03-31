import { Link } from '@tanstack/react-router';

import type { ImportDetailResult } from '@/modules/imports/api/list-import-rows';

import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Timestamp } from '@/components/ui/timestamp';
import { m } from '@/paraglide/messages';

const statusVariant = {
  committed: 'success',
  completed: 'outline',
  failed: 'destructive',
  pending: 'secondary',
  processing: 'info',
} as const;

type ImportDetailHeaderProps = { import: ImportDetailResult['import'] };

export function ImportDetailHeader({ import: imp }: ImportDetailHeaderProps) {
  const variant = statusVariant[imp.status] ?? 'secondary';

  return (
    <div className="flex flex-col gap-2">
      <Link
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        to="/imports"
      >
        <Icons.ArrowLeft className="size-4" />
        {m['imports.detail.backToImports']()}
      </Link>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {imp.fileName ?? m['imports.detail.title']()}
        </h1>
        <Badge variant={variant}>{imp.status}</Badge>
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {imp.accountName && <span>{imp.accountName}</span>}
        {imp.importedAt && <Timestamp value={imp.importedAt} />}
      </div>
    </div>
  );
}
