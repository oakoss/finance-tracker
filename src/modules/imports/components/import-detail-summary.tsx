import type { ImportRowItem } from '@/modules/imports/api/list-import-rows';

import { Badge } from '@/components/ui/badge';
import { m } from '@/paraglide/messages';

type ImportDetailSummaryProps = { rows: ImportRowItem[] };

const statusConfig = {
  committed: {
    label: (c: number) => m['imports.detail.summary.committed']({ count: c }),
    variant: 'success' as const,
  },
  duplicate: {
    label: (c: number) => m['imports.detail.summary.duplicate']({ count: c }),
    variant: 'warning' as const,
  },
  error: {
    label: (c: number) => m['imports.detail.summary.error']({ count: c }),
    variant: 'destructive' as const,
  },
  ignored: {
    label: (c: number) => m['imports.detail.summary.ignored']({ count: c }),
    variant: 'secondary' as const,
  },
  mapped: {
    label: (c: number) => m['imports.detail.summary.mapped']({ count: c }),
    variant: 'info' as const,
  },
} as const;

export function ImportDetailSummary({ rows }: ImportDetailSummaryProps) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {Object.entries(statusConfig).map(([status, config]) => {
        const count = counts[status] ?? 0;
        if (count === 0) return null;
        return (
          <Badge key={status} variant={config.variant}>
            {config.label(count)}
          </Badge>
        );
      })}
    </div>
  );
}
