import type { BudgetVsActualItem } from '@/modules/budgets/api/get-budget-vs-actual';

import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from '@/components/ui/progress';
import { formatCurrency } from '@/lib/i18n/number';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages';

function BudgetStatus({
  isOver,
  remaining,
  spent,
}: {
  isOver: boolean;
  remaining: number;
  spent: number;
}) {
  if (spent === 0) {
    return <>{m['budgets.noSpending']()}</>;
  }
  if (isOver) {
    return (
      <span className="text-destructive">
        {m['budgets.overBy']({
          amount: formatCurrency({ amountCents: Math.abs(remaining) }),
        })}
      </span>
    );
  }
  return (
    <>
      {m['budgets.remaining']({
        amount: formatCurrency({ amountCents: remaining }),
      })}
    </>
  );
}

export function BudgetCategoryRow({ item }: { item: BudgetVsActualItem }) {
  const spent = item.actualDebitCents;
  const budgeted = item.budgetedCents;
  const remaining = budgeted - spent;
  const isOver = remaining < 0;
  const percentage = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0;

  const spentFormatted = formatCurrency({ amountCents: spent });
  const budgetedFormatted = formatCurrency({ amountCents: budgeted });

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{item.categoryName}</span>
        <span className="font-mono text-sm tabular-nums">
          {spentFormatted} / {budgetedFormatted}
        </span>
      </div>
      <Progress value={percentage}>
        <ProgressTrack>
          <ProgressIndicator className={cn(isOver && 'bg-destructive')} />
        </ProgressTrack>
      </Progress>
      <div className="text-xs text-muted-foreground">
        <BudgetStatus isOver={isOver} remaining={remaining} spent={spent} />
      </div>
    </div>
  );
}
