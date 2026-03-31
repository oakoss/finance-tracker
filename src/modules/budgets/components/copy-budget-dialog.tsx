import { useMemo, useState } from 'react';

import type { BudgetPeriodListItem } from '@/modules/budgets/api/list-budget-periods';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatMonthYear } from '@/lib/i18n/date';
import { useCopyBudgetPeriod } from '@/modules/budgets/hooks/use-budgets';
import { m } from '@/paraglide/messages';

export function CopyBudgetDialog({
  month,
  onOpenChange,
  open,
  periods,
  year,
}: {
  month: number;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  periods: BudgetPeriodListItem[];
  year: number;
}) {
  const mutation = useCopyBudgetPeriod();
  const [sourcePeriodId, setSourcePeriodId] = useState('');

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sourcePeriodId) return;
    mutation.mutate(
      { month, sourcePeriodId, year },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSourcePeriodId('');
        },
      },
    );
  }

  const targetLabel = useMemo(
    () => formatMonthYear({ value: new Date(year, month - 1, 1) }),
    [year, month],
  );

  const periodItems = useMemo(
    () =>
      Object.fromEntries(
        periods.map((p) => [
          p.id,
          formatMonthYear({ value: new Date(p.year, p.month - 1, 1) }),
        ]),
      ),
    [periods],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{m['budgets.copy.title']()}</DialogTitle>
          <DialogDescription>
            {m['budgets.copy.description']()}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          id="copy-budget-form"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="source-period">
              {m['budgets.copy.sourcePeriod']()}
            </label>
            <Select
              items={periodItems}
              value={sourcePeriodId}
              onValueChange={(value) => setSourcePeriodId(value ?? '')}
            >
              <SelectTrigger className="w-full" id="source-period">
                <SelectValue
                  placeholder={m['budgets.copy.sourcePeriodPlaceholder']()}
                />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {formatMonthYear({
                      value: new Date(p.year, p.month - 1, 1),
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            {m['budgets.copy.target']()}{' '}
            <span className="font-medium text-foreground">{targetLabel}</span>
          </div>
        </form>
        <DialogFooter>
          <Button
            disabled={mutation.isPending}
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {m['actions.cancel']()}
          </Button>
          <Button
            disabled={!sourcePeriodId || mutation.isPending}
            form="copy-budget-form"
            loading={mutation.isPending}
            type="submit"
          >
            {m['budgets.copy.submit']()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
