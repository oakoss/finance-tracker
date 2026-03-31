import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import type { BudgetLineListItem } from '@/modules/budgets/api/list-budget-lines';
import type { BudgetPeriodListItem } from '@/modules/budgets/api/list-budget-periods';
import type { CategoryListItem } from '@/modules/categories/api/list-categories';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { formatCurrency } from '@/lib/i18n/number';
import { budgetLineQueries } from '@/modules/budgets/hooks/use-budgets';
import {
  type SaveLine,
  useSaveBudget,
} from '@/modules/budgets/hooks/use-save-budget';
import { categoryQueries } from '@/modules/categories/hooks/use-categories';
import { m } from '@/paraglide/messages';

type LineState = { amount: string; existingLineId?: string | undefined };

type CategoryGroup = {
  children: { id: string; name: string }[];
  parent: { id: string; name: string } | null;
};

function groupExpenseCategories(
  categories: CategoryListItem[],
): CategoryGroup[] {
  const expense = categories.filter((c) => c.type === 'expense');
  const byParent = new Map<string | null, CategoryListItem[]>();

  for (const cat of expense) {
    const key = cat.parentId;
    const arr = byParent.get(key) ?? [];
    arr.push(cat);
    byParent.set(key, arr);
  }

  const groups: CategoryGroup[] = [];
  const groupedIds = new Set<string>();

  // Parents with children
  for (const cat of expense) {
    if (cat.parentId === null && byParent.has(cat.id)) {
      groupedIds.add(cat.id);
      const children = byParent.get(cat.id) ?? [];
      for (const child of children) groupedIds.add(child.id);
      groups.push({
        children: children.map((c) => ({ id: c.id, name: c.name })),
        parent: { id: cat.id, name: cat.name },
      });
    }
  }

  // Standalone top-level categories (no children) get their own group
  for (const cat of expense) {
    if (cat.parentId === null && !groupedIds.has(cat.id)) {
      groupedIds.add(cat.id);
      groups.push({
        children: [{ id: cat.id, name: cat.name }],
        parent: { id: cat.id, name: cat.name },
      });
    }
  }

  // Remaining: subcategories whose parent was not grouped above
  const ungrouped = expense.filter((c) => !groupedIds.has(c.id));

  if (ungrouped.length > 0) {
    groups.push({
      children: ungrouped.map((c) => ({ id: c.id, name: c.name })),
      parent: null,
    });
  }

  return groups;
}

function centsToDisplay(cents: number): string {
  return (cents / 100).toFixed(2);
}

function displayToCents(display: string): number | null {
  if (display.trim() === '') return null;
  const num = Number.parseFloat(display);
  if (Number.isNaN(num) || num < 0) return null;
  return Math.round(num * 100);
}

function buildInitialState(
  categories: CategoryGroup[],
  lines: BudgetLineListItem[],
): Map<string, LineState> {
  const lineMap = new Map(lines.map((l) => [l.categoryId, l]));
  const state = new Map<string, LineState>();

  for (const group of categories) {
    for (const child of group.children) {
      const existing = lineMap.get(child.id);
      const amount = existing ? centsToDisplay(existing.amountCents) : '';
      state.set(child.id, { amount, existingLineId: existing?.id });
    }
  }

  return state;
}

// ---------------------------------------------------------------------------
// Outer dialog — manages data fetching, delegates form to inner component
// ---------------------------------------------------------------------------

export function EditBudgetDialog({
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
  const { data: categories } = useSuspenseQuery(categoryQueries.list());
  const activePeriod = periods.find(
    (p) => p.month === month && p.year === year,
  );

  const {
    data: currentLines,
    isError: isLinesError,
    isLoading: isLinesLoading,
  } = useQuery({
    ...budgetLineQueries.list(activePeriod?.id ?? ''),
    enabled: !!activePeriod,
  });

  // Previous month lines for reference
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevPeriod = periods.find(
    (p) => p.month === prevMonth && p.year === prevYear,
  );
  const { data: prevLines, isError: isPrevLinesError } = useQuery({
    ...budgetLineQueries.list(prevPeriod?.id ?? ''),
    enabled: !!prevPeriod,
  });

  const groups = useMemo(
    () => groupExpenseCategories(categories),
    [categories],
  );

  const linesReady = !activePeriod || !isLinesLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m['budgets.editBudget']()}</DialogTitle>
          <DialogDescription>
            {m['budgets.edit.description']()}
          </DialogDescription>
        </DialogHeader>
        {open && isLinesError && (
          <p className="py-4 text-center text-sm text-destructive">
            {m['budgets.edit.loadError']()}
          </p>
        )}
        {open && !isLinesError && linesReady && (
          <EditBudgetForm
            activePeriodId={activePeriod?.id}
            currentLines={currentLines ?? []}
            groups={groups}
            month={month}
            prevLines={prevLines ?? []}
            prevLinesError={isPrevLinesError}
            year={year}
            onClose={() => onOpenChange(false)}
          />
        )}
        {open && !isLinesError && !linesReady && (
          <div className="flex items-center justify-center py-8">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Inner form — owns line state; unmounts when dialog closes (open && guard
// in parent) so state resets on each open
// ---------------------------------------------------------------------------

function EditBudgetForm({
  activePeriodId,
  currentLines,
  groups,
  month,
  onClose,
  prevLines,
  prevLinesError,
  year,
}: {
  activePeriodId?: string | undefined;
  currentLines: BudgetLineListItem[];
  groups: CategoryGroup[];
  month: number;
  onClose: () => void;
  prevLines: BudgetLineListItem[];
  prevLinesError: boolean;
  year: number;
}) {
  const [lineState, setLineState] = useState(() =>
    buildInitialState(groups, currentLines),
  );

  const { isPending, save } = useSaveBudget();

  const prevLineMap = useMemo(
    () => new Map(prevLines.map((l) => [l.categoryId, l])),
    [prevLines],
  );

  const amounts = useMemo(() => {
    const map = new Map<string, string>();
    for (const [id, state] of lineState) {
      map.set(id, state.amount);
    }
    return map;
  }, [lineState]);

  function updateAmount(categoryId: string, value: string) {
    setLineState((prev) => {
      const next = new Map(prev);
      const existing = next.get(categoryId);
      if (existing) {
        next.set(categoryId, { ...existing, amount: value });
      }
      return next;
    });
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    const lines: SaveLine[] = [];

    for (const [categoryId, state] of lineState) {
      // Blank with an existing line → treat as 0 to trigger deletion
      const amountCents =
        displayToCents(state.amount) ?? (state.existingLineId ? 0 : null);
      if (amountCents === null) continue;

      if (state.existingLineId && amountCents > 0) {
        lines.push({
          amountCents,
          categoryId,
          existingLineId: state.existingLineId,
          op: 'update',
        });
      } else if (state.existingLineId && amountCents === 0) {
        lines.push({
          categoryId,
          existingLineId: state.existingLineId,
          op: 'delete',
        });
      } else if (!state.existingLineId && amountCents > 0) {
        lines.push({ amountCents, categoryId, op: 'create' });
      }
    }

    const success = await save({
      existingPeriodId: activePeriodId,
      lines,
      month,
      year,
    });

    if (success) {
      onClose();
    }
  }

  const hasCategories = groups.some((g) => g.children.length > 0);

  return (
    <>
      <form
        className="flex flex-col gap-2"
        id="edit-budget-form"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <FormContent
          amounts={amounts}
          groups={groups}
          prevLineMap={prevLineMap}
          prevLinesError={prevLinesError}
          onAmountChange={updateAmount}
        />
      </form>
      <DialogFooter>
        <Button disabled={isPending} variant="outline" onClick={onClose}>
          {m['actions.cancel']()}
        </Button>
        <Button
          disabled={isPending || !hasCategories}
          form="edit-budget-form"
          loading={isPending}
          type="submit"
        >
          {m['actions.save']()}
        </Button>
      </DialogFooter>
    </>
  );
}

// ---------------------------------------------------------------------------
// Form content — empty / category list
// ---------------------------------------------------------------------------

function FormContent({
  amounts,
  groups,
  onAmountChange,
  prevLineMap,
  prevLinesError,
}: {
  amounts: Map<string, string>;
  groups: CategoryGroup[];
  onAmountChange: (categoryId: string, value: string) => void;
  prevLineMap: Map<string, BudgetLineListItem>;
  prevLinesError: boolean;
}) {
  const hasCategories = groups.some((g) => g.children.length > 0);
  if (!hasCategories) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {m['budgets.edit.noExpenseCategories']()}
      </p>
    );
  }

  let prevMonthHint: { className: string; message: string } | null = null;
  if (prevLinesError) {
    prevMonthHint = {
      className: 'text-xs text-destructive',
      message: m['budgets.edit.previousLoadError'](),
    };
  } else if (prevLineMap.size === 0) {
    prevMonthHint = {
      className: 'text-xs text-muted-foreground',
      message: m['budgets.edit.noPreviousData'](),
    };
  }

  return (
    <ScrollArea className="max-h-[60vh]">
      <div className="flex flex-col gap-4 pr-3">
        {prevMonthHint && (
          <p className={prevMonthHint.className}>{prevMonthHint.message}</p>
        )}
        {groups.map((group) => (
          <fieldset
            key={group.parent?.id ?? 'ungrouped'}
            className="flex flex-col gap-2"
          >
            <legend className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {group.parent?.name ?? m['budgets.edit.uncategorized']()}
            </legend>
            {group.children.map((child) => {
              const amount = amounts.get(child.id);
              const prevLine = prevLineMap.get(child.id);
              return (
                <div key={child.id} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {child.name}
                  </span>
                  {prevLine && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {m['budgets.edit.previousMonth']()}{' '}
                      {formatCurrency({ amountCents: prevLine.amountCents })}
                    </span>
                  )}
                  <Input
                    aria-label={child.name}
                    className="w-28 shrink-0 text-right"
                    inputMode="decimal"
                    min="0"
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={amount ?? ''}
                    onChange={(e) => onAmountChange(child.id, e.target.value)}
                  />
                </div>
              );
            })}
          </fieldset>
        ))}
      </div>
    </ScrollArea>
  );
}
