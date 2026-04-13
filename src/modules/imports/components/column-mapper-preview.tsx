import { useMemo } from 'react';

import type { ColumnMapping, TargetField } from '@/modules/imports/validators';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getFieldLabel } from '@/modules/imports/components/column-mapper';
import {
  applyColumnMapping,
  type NormalizedRow,
} from '@/modules/imports/lib/apply-column-mapping';
import { m } from '@/paraglide/messages';

const AMOUNT_FIELDS = new Set<TargetField>([
  'amount',
  'creditAmount',
  'debitAmount',
]);

function formatCellValue(row: NormalizedRow, field: TargetField): string {
  if (AMOUNT_FIELDS.has(field)) {
    return row.amountCents !== undefined
      ? (row.amountCents / 100).toFixed(2)
      : '';
  }
  return row[field as keyof NormalizedRow]?.toString() ?? '';
}

type ColumnMapperPreviewProps = {
  columnMapping: ColumnMapping;
  sampleRows: Record<string, string>[];
};

export function ColumnMapperPreview({
  columnMapping,
  sampleRows,
}: ColumnMapperPreviewProps) {
  const mappedHeaders = useMemo(() => {
    const fields = Object.values(columnMapping.mapping).filter(
      (f) => f !== 'skip',
    );
    // Collapse debitAmount/creditAmount into a single "amount" preview column
    const seen = new Set<TargetField>();
    const result: TargetField[] = [];
    for (const field of fields) {
      const normalized = AMOUNT_FIELDS.has(field) ? 'amount' : field;
      if (!seen.has(normalized)) {
        seen.add(normalized);
        result.push(normalized);
      }
    }
    return result;
  }, [columnMapping.mapping]);

  const normalizedRows = useMemo(
    () =>
      sampleRows.map((row, idx) => ({
        key: `row-${String(idx)}`,
        normalized: applyColumnMapping(row, columnMapping),
      })),
    [sampleRows, columnMapping],
  );

  if (mappedHeaders.length === 0 || sampleRows.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{m['imports.upload.preview']()}</p>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {mappedHeaders.map((field) => (
                <TableHead key={field}>{getFieldLabel(field)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {normalizedRows.map(({ key, normalized }) => (
              <TableRow key={key}>
                {mappedHeaders.map((field) => (
                  <TableCell key={field} className="text-muted-foreground">
                    {formatCellValue(normalized, field)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
