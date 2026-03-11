import { useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';

import type { BudgetPeriodListItem } from '@/modules/budgets/api/list-budget-periods';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useHydrated } from '@/hooks/use-hydrated';
import { formatMonthYear } from '@/lib/i18n/date';
import { CopyBudgetDialog } from '@/modules/budgets/components/copy-budget-dialog';
import { m } from '@/paraglide/messages';

export function BudgetsPageHeader({
  periods,
}: {
  periods: BudgetPeriodListItem[];
}) {
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const search = useSearch({ from: '/_app/budgets' });
  const [copyOpen, setCopyOpen] = useState(false);

  const now = new Date();
  const month = search.month ?? now.getMonth() + 1;
  const year = search.year ?? now.getFullYear();

  function goToMonth(targetMonth: number, targetYear: number) {
    let nextMonth = targetMonth;
    let nextYear = targetYear;
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    } else if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    void navigate({
      search: { month: nextMonth, year: nextYear },
      to: '/budgets',
    });
  }

  const label = formatMonthYear({
    value: new Date(year, month - 1, 1),
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {m['budgets.title']()}
        </h1>
        <div className="flex items-center gap-2">
          {periods.length > 0 && (
            <Button
              disabled={!hydrated}
              size="sm"
              variant="outline"
              onClick={() => setCopyOpen(true)}
            >
              <Icons.Copy className="size-4" />
              {m['budgets.copyPrevious']()}
            </Button>
          )}
        </div>
      </div>
      <div className="flex items-center justify-center gap-3">
        <Button
          aria-label={m['budgets.previousMonth']()}
          disabled={!hydrated}
          size="icon"
          variant="ghost"
          onClick={() => goToMonth(month - 1, year)}
        >
          <Icons.ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-40 text-center text-sm font-medium">
          {label}
        </span>
        <Button
          aria-label={m['budgets.nextMonth']()}
          disabled={!hydrated}
          size="icon"
          variant="ghost"
          onClick={() => goToMonth(month + 1, year)}
        >
          <Icons.ChevronRight className="size-4" />
        </Button>
      </div>
      <CopyBudgetDialog
        month={month}
        open={copyOpen}
        periods={periods}
        year={year}
        onOpenChange={setCopyOpen}
      />
    </>
  );
}
