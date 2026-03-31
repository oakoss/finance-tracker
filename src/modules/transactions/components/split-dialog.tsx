import { useSuspenseQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import type { TransactionListItem } from '@/modules/transactions/api/list-transactions';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/i18n/number';
import { categoryQueries } from '@/modules/categories/hooks/use-categories';
import {
  useSplitTransaction,
  useUpdateSplitLines,
} from '@/modules/transactions/hooks/use-transactions';
import { m } from '@/paraglide/messages';

type SplitLine = {
  amount: string;
  categoryId: string;
  key: string;
  memo: string;
};

let lineKeyCounter = 0;
function nextKey() {
  return `sl-${++lineKeyCounter}`;
}

type SplitDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  transaction: TransactionListItem;
};

function parseDollarsToCents(str: string): number {
  const trimmed = str.trim();
  if (!trimmed) return 0;
  const [whole = '0', frac = ''] = trimmed.split('.');
  const paddedFrac = `${frac}00`.slice(0, 2);
  const cents = Number(whole) * 100 + Number(paddedFrac);
  return Number.isFinite(cents) ? cents : 0;
}

function emptyLine(): SplitLine {
  return { amount: '', categoryId: '', key: nextKey(), memo: '' };
}

function initLines(transaction: TransactionListItem): SplitLine[] {
  if (transaction.isSplit && transaction.splitLines.length >= 2) {
    return transaction.splitLines.map((sl) => ({
      amount: (sl.amountCents / 100).toFixed(2),
      categoryId: sl.categoryId ?? '',
      key: nextKey(),
      memo: sl.memo ?? '',
    }));
  }
  const total = (transaction.amountCents / 100).toFixed(2);
  return [
    {
      amount: total,
      categoryId: transaction.categoryId ?? '',
      key: nextKey(),
      memo: '',
    },
    emptyLine(),
  ];
}

export function SplitDialog({
  onOpenChange,
  open,
  transaction,
}: SplitDialogProps) {
  const { data: categories } = useSuspenseQuery(categoryQueries.list());
  const isEdit = transaction.isSplit;
  const splitMutation = useSplitTransaction();
  const updateMutation = useUpdateSplitLines();
  const isPending = splitMutation.isPending || updateMutation.isPending;

  const [lines, setLines] = useState<SplitLine[]>(() => initLines(transaction));

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        setLines(initLines(transaction));
      }
      onOpenChange(next);
    },
    [onOpenChange, transaction],
  );

  const updateLine = (index: number, field: keyof SplitLine, value: string) => {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    );
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const addLine = () => {
    setLines((prev) => [...prev, emptyLine()]);
  };

  const lineCents = lines.map((l) => parseDollarsToCents(l.amount));
  const currentSum = lineCents.reduce((a, b) => a + b, 0);
  const remainingCents = transaction.amountCents - currentSum;
  const isValid =
    remainingCents === 0 && lines.length >= 2 && lineCents.every((c) => c > 0);

  const categoryNoneLabel = m['transactions.split.categoryNone']();
  const categoryItems = Object.fromEntries([
    ['__none__', categoryNoneLabel],
    ...categories.map((c) => [c.id, c.name] as const),
  ]);

  const handleSubmit = () => {
    const payload = {
      id: transaction.id,
      lines: lines.map((l) => ({
        amountCents: parseDollarsToCents(l.amount),
        ...(l.categoryId && l.categoryId !== '__none__'
          ? { categoryId: l.categoryId }
          : {}),
        ...(l.memo ? { memo: l.memo } : {}),
      })),
    };

    const mutation = isEdit ? updateMutation : splitMutation;
    mutation.mutate(payload, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? m['transactions.split.editTitle']()
              : m['transactions.split.title']()}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? m['transactions.split.editDescription']()
              : m['transactions.split.description']()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {m['transactions.columns.amount']()}:{' '}
            <span className="font-mono font-medium tabular-nums">
              {formatCurrency({ amountCents: transaction.amountCents })}
            </span>
          </p>

          {lines.map((line, index) => (
            <div
              key={line.key}
              className="grid grid-cols-[1fr_1fr_auto] items-end gap-2"
            >
              <Field>
                <FieldLabel>{m['transactions.split.amount']()}</FieldLabel>
                <Input
                  min="0.01"
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={line.amount}
                  onChange={(e) => updateLine(index, 'amount', e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>{m['transactions.split.category']()}</FieldLabel>
                <Select
                  items={categoryItems}
                  value={line.categoryId || '__none__'}
                  onValueChange={(v) =>
                    updateLine(
                      index,
                      'categoryId',
                      v === '__none__' ? '' : (v ?? ''),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      {categoryNoneLabel}
                    </SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Button
                aria-label={m['transactions.split.removeLine']()}
                disabled={lines.length <= 2}
                size="icon"
                variant="ghost"
                onClick={() => removeLine(index)}
              >
                <Icons.Trash2 className="size-4" />
              </Button>
            </div>
          ))}

          <div className="flex items-center justify-between">
            <Button size="sm" type="button" variant="outline" onClick={addLine}>
              <Icons.Plus className="mr-1 size-4" />
              {m['transactions.split.addLine']()}
            </Button>
            <p
              className={`font-mono text-sm tabular-nums ${
                remainingCents === 0
                  ? 'text-muted-foreground'
                  : 'font-medium text-destructive'
              }`}
            >
              {m['transactions.split.remaining']({
                amount: formatCurrency({
                  amountCents: Math.abs(remainingCents),
                }),
              })}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {m['actions.cancel']()}
          </Button>
          <Button
            disabled={!isValid || isPending}
            loading={isPending}
            onClick={handleSubmit}
          >
            {m['actions.save']()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
