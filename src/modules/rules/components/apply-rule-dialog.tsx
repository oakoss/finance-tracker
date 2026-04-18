import { useMemo, useState } from 'react';

import type { PreviewApplySample } from '@/modules/rules/services/preview-apply-merchant-rule';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/i18n/date';
import { formatCurrency } from '@/lib/i18n/number';
import { useApplyMerchantRule } from '@/modules/rules/hooks/use-merchant-rules';
import { usePreviewApply } from '@/modules/rules/hooks/use-preview-apply';
import { m } from '@/paraglide/messages';

type ApplyRuleDialogProps = {
  onClose: () => void;
  open: boolean;
  ruleId: null | string;
};

export function ApplyRuleDialog(props: ApplyRuleDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={(next) => !next && props.onClose()}>
      <DialogContent size="xl">
        {props.open && props.ruleId !== null && (
          <ApplyBody
            key={props.ruleId}
            ruleId={props.ruleId}
            onClose={props.onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type ApplyBodyProps = { onClose: () => void; ruleId: string };

function ApplyBody({ onClose, ruleId }: ApplyBodyProps) {
  const preview = usePreviewApply(ruleId);
  const apply = useApplyMerchantRule();
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set());

  const sample = useMemo(
    () => preview.data?.sample ?? [],
    [preview.data?.sample],
  );
  const count = preview.data?.count ?? 0;
  // Reconcile against the current sample so a refetch that returns
  // different rows can't leave orphan exclude ids inflating the count.
  const effectiveExcluded = useMemo(() => {
    const sampleIds = new Set(sample.map((row) => row.id));
    return new Set([...excluded].filter((id) => sampleIds.has(id)));
  }, [excluded, sample]);
  const appliedCount = Math.max(0, count - effectiveExcluded.size);

  const headerState = useMemo<'all' | 'indeterminate' | 'none'>(() => {
    if (sample.length === 0) return 'none';
    if (effectiveExcluded.size === 0) return 'all';
    if (effectiveExcluded.size === sample.length) return 'none';
    return 'indeterminate';
  }, [effectiveExcluded, sample.length]);

  const toggleRow = (id: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllShown = () => {
    setExcluded(
      headerState === 'all' ? new Set(sample.map((row) => row.id)) : new Set(),
    );
  };

  const handleApply = () => {
    if (apply.isPending || appliedCount === 0) return;
    const excludeTransactionIds = [...effectiveExcluded];
    apply.mutate(
      {
        id: ruleId,
        ...(excludeTransactionIds.length > 0 && { excludeTransactionIds }),
      },
      { onSuccess: onClose },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{m['rules.apply.confirmTitle']()}</DialogTitle>
        <DialogDescription>{m['rules.apply.description']()}</DialogDescription>
      </DialogHeader>

      {preview.isPending ? (
        <PreviewLoading />
      ) : preview.isError ? (
        <div className="flex items-center justify-between gap-3" role="alert">
          <p className="text-sm text-destructive">
            {m['rules.form.previewError']()}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void preview.refetch()}
          >
            {m['rules.apply.retry']()}
          </Button>
        </div>
      ) : count === 0 ? (
        <p className="text-sm text-muted-foreground">
          {m['rules.apply.noMatches']()}
        </p>
      ) : (
        <PreviewTable
          excluded={effectiveExcluded}
          headerState={headerState}
          sample={sample}
          onToggleAllShown={toggleAllShown}
          onToggleRow={toggleRow}
        />
      )}

      {count > sample.length && (
        <p className="text-xs text-muted-foreground">
          {m['rules.apply.showingSubset']({
            shown: String(sample.length),
            total: String(count),
          })}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {m['rules.apply.undoHint']()}
      </p>

      <DialogFooter>
        <Button disabled={apply.isPending} variant="outline" onClick={onClose}>
          {m['actions.cancel']()}
        </Button>
        <Button
          disabled={appliedCount === 0}
          loading={apply.isPending}
          onClick={handleApply}
        >
          {effectiveExcluded.size > 0
            ? m['rules.apply.confirmCtaWithExcluded']({
                count: String(appliedCount),
                excluded: String(effectiveExcluded.size),
              })
            : m['rules.apply.confirmCta']({ count: String(appliedCount) })}
        </Button>
      </DialogFooter>
    </>
  );
}

function PreviewLoading() {
  return (
    <div
      aria-label={m['rules.apply.previewRegion']()}
      className="flex flex-col gap-2"
      role="status"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

type PreviewTableProps = {
  excluded: Set<string>;
  headerState: 'all' | 'indeterminate' | 'none';
  onToggleAllShown: () => void;
  onToggleRow: (id: string) => void;
  sample: PreviewApplySample[];
};

function PreviewTable({
  excluded,
  headerState,
  onToggleAllShown,
  onToggleRow,
  sample,
}: PreviewTableProps) {
  return (
    <div className="max-h-96 overflow-auto rounded-md border">
      <table
        aria-label={m['rules.apply.previewRegion']()}
        className="w-full text-sm"
      >
        <thead className="sticky top-0 bg-muted">
          <tr>
            <th className="w-10 p-2" scope="col">
              <Checkbox
                aria-label={m['rules.apply.selectAllShown']()}
                checked={headerState === 'all'}
                indeterminate={headerState === 'indeterminate'}
                onCheckedChange={onToggleAllShown}
              />
            </th>
            <th className="p-2 text-left font-medium" scope="col">
              {m['rules.apply.column.date']()}
            </th>
            <th className="p-2 text-left font-medium" scope="col">
              {m['rules.apply.column.description']()}
            </th>
            <th className="p-2 text-left font-medium" scope="col">
              {m['rules.apply.column.account']()}
            </th>
            <th className="p-2 text-left font-medium" scope="col">
              {m['rules.apply.column.category']()}
            </th>
            <th className="p-2 text-right font-medium" scope="col">
              {m['rules.apply.column.amount']()}
            </th>
          </tr>
        </thead>
        <tbody>
          {sample.map((row) => {
            const isChecked = !excluded.has(row.id);
            const dateLabel = formatDate({ value: row.transactionAt });
            return (
              <tr key={row.id} className="border-t hover:bg-muted/40">
                <td className="p-2">
                  <Checkbox
                    aria-label={m['rules.apply.rowLabel']({
                      date: dateLabel,
                      description: row.description,
                    })}
                    checked={isChecked}
                    onCheckedChange={() => onToggleRow(row.id)}
                  />
                </td>
                <td className="p-2 whitespace-nowrap">{dateLabel}</td>
                <td className="max-w-48 truncate p-2">{row.description}</td>
                <td className="p-2 whitespace-nowrap">{row.accountName}</td>
                <td className="p-2 whitespace-nowrap text-muted-foreground">
                  {row.categoryName ?? m['rules.match.emptyValue']()}
                </td>
                <td className="p-2 text-right font-mono whitespace-nowrap">
                  {row.direction === 'debit' ? '-' : '+'}
                  {formatCurrency({ amountCents: row.amountCents })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
