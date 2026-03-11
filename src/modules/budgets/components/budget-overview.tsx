import { useSuspenseQuery } from '@tanstack/react-query';

import { formatCurrency } from '@/lib/i18n/number';
import { cn } from '@/lib/utils';
import { BudgetCategoryRow } from '@/modules/budgets/components/budget-category-row';
import { budgetVsActualQueries } from '@/modules/budgets/hooks/use-budgets';
import { m } from '@/paraglide/messages';

export function BudgetOverview({ periodId }: { periodId: string }) {
  const { data: items } = useSuspenseQuery(
    budgetVsActualQueries.detail(periodId),
  );

  const totalBudgeted = items.reduce((sum, i) => sum + i.budgetedCents, 0);
  const totalSpent = items.reduce((sum, i) => sum + i.actualDebitCents, 0);
  const totalRemaining = totalBudgeted - totalSpent;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4 rounded-lg border p-4">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground">
            {m['budgets.summary.budgeted']()}
          </span>
          <span className="font-mono text-lg font-semibold tabular-nums">
            {formatCurrency({ amountCents: totalBudgeted })}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground">
            {m['budgets.summary.spent']()}
          </span>
          <span className="font-mono text-lg font-semibold tabular-nums">
            {formatCurrency({ amountCents: totalSpent })}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground">
            {m['budgets.summary.remaining']()}
          </span>
          <span
            className={cn(
              'font-mono text-lg font-semibold tabular-nums',
              totalRemaining < 0 && 'text-destructive',
            )}
          >
            {formatCurrency({ amountCents: totalRemaining })}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <BudgetCategoryRow key={item.budgetLineId} item={item} />
        ))}
      </div>
    </div>
  );
}
