import { useSuspenseQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { type } from 'arktype';
import { useState } from 'react';

import type { BudgetPeriodListItem } from '@/modules/budgets/api/list-budget-periods';

import { RootErrorBoundary } from '@/components/errors/root-error-boundary';
import { BudgetOverview } from '@/modules/budgets/components/budget-overview';
import { BudgetsEmpty } from '@/modules/budgets/components/budgets-empty';
import { BudgetsPageHeader } from '@/modules/budgets/components/budgets-page-header';
import { EditBudgetDialog } from '@/modules/budgets/components/edit-budget-dialog';
import {
  budgetPeriodQueries,
  budgetVsActualQueries,
} from '@/modules/budgets/hooks/use-budgets';
import { categoryQueries } from '@/modules/categories/hooks/use-categories';

const searchSchema = type({
  'month?': '1 <= number.integer <= 12',
  'year?': '2000 <= number.integer <= 2100',
});

type BudgetSearch = typeof searchSchema.infer;

export const Route = createFileRoute('/_app/budgets')({
  validateSearch: (raw): BudgetSearch => {
    const result = searchSchema(raw);
    if (result instanceof type.errors) return {};
    return result;
  },
  component: BudgetsPage,
  errorComponent: BudgetsError,
  loaderDeps: ({ search }) => ({ month: search.month, year: search.year }),
  loader: async ({ context, deps }) => {
    const [periods] = await Promise.all([
      context.queryClient.ensureQueryData(budgetPeriodQueries.list()),
      context.queryClient.ensureQueryData(categoryQueries.list()),
    ]);

    const now = new Date();
    const month = deps.month ?? now.getMonth() + 1;
    const year = deps.year ?? now.getFullYear();

    const matchingPeriod = periods.find(
      (p) => p.month === month && p.year === year,
    );

    if (matchingPeriod) {
      await context.queryClient.ensureQueryData(
        budgetVsActualQueries.detail(matchingPeriod.id),
      );
    }
  },
});

function BudgetsPage() {
  const search = Route.useSearch();
  const { data: periods } = useSuspenseQuery(budgetPeriodQueries.list());
  const [editOpen, setEditOpen] = useState(false);

  const now = new Date();
  const month = search.month ?? now.getMonth() + 1;
  const year = search.year ?? now.getFullYear();

  const activePeriod = periods.find(
    (p) => p.month === month && p.year === year,
  );

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <BudgetsPageHeader
        periods={periods}
        onEditClick={() => setEditOpen(true)}
      />
      <BudgetsContent
        activePeriod={activePeriod}
        periods={periods}
        onCreateClick={() => setEditOpen(true)}
      />
      <EditBudgetDialog
        month={month}
        open={editOpen}
        periods={periods}
        year={year}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}

function BudgetsContent({
  activePeriod,
  onCreateClick,
  periods,
}: {
  activePeriod: BudgetPeriodListItem | undefined;
  onCreateClick: () => void;
  periods: BudgetPeriodListItem[];
}) {
  if (periods.length === 0) {
    return <BudgetsEmpty variant="noPeriods" onCreateClick={onCreateClick} />;
  }
  if (activePeriod) {
    return <BudgetOverview periodId={activePeriod.id} />;
  }
  return (
    <BudgetsEmpty variant="noCurrentPeriod" onCreateClick={onCreateClick} />
  );
}

function BudgetsError(props: ErrorComponentProps) {
  return (
    <div className="flex flex-1 flex-col px-4 py-6 lg:px-6">
      <RootErrorBoundary {...props} />
    </div>
  );
}
