import { queryOptions } from '@tanstack/react-query';

import type {
  CopyBudgetPeriodInput,
  CreateBudgetLineInput,
  CreateBudgetPeriodInput,
  DeleteBudgetLineInput,
  DeleteBudgetPeriodInput,
  UpdateBudgetLineInput,
  UpdateBudgetPeriodInput,
} from '@/modules/budgets/validators';

import { useAnalytics } from '@/hooks/use-analytics';
import { useResourceMutation } from '@/hooks/use-resource-mutation';
import { copyBudgetPeriod } from '@/modules/budgets/api/copy-budget-period';
import { createBudgetLine } from '@/modules/budgets/api/create-budget-line';
import { createBudgetPeriod } from '@/modules/budgets/api/create-budget-period';
import { deleteBudgetLine } from '@/modules/budgets/api/delete-budget-line';
import { deleteBudgetPeriod } from '@/modules/budgets/api/delete-budget-period';
import { getBudgetVsActual } from '@/modules/budgets/api/get-budget-vs-actual';
import { listBudgetLines } from '@/modules/budgets/api/list-budget-lines';
import { listBudgetPeriods } from '@/modules/budgets/api/list-budget-periods';
import { updateBudgetLine } from '@/modules/budgets/api/update-budget-line';
import { updateBudgetPeriod } from '@/modules/budgets/api/update-budget-period';
import { m } from '@/paraglide/messages';

export const budgetPeriodQueries = {
  all: () => ['budgetPeriods'] as const,
  list: () =>
    queryOptions({
      queryFn: () => listBudgetPeriods(),
      queryKey: [...budgetPeriodQueries.all(), 'list'],
    }),
};

export const budgetLineQueries = {
  all: () => ['budgetLines'] as const,
  list: (budgetPeriodId: string) =>
    queryOptions({
      queryFn: () => listBudgetLines({ data: { budgetPeriodId } }),
      queryKey: [...budgetLineQueries.all(), 'list', budgetPeriodId],
    }),
};

export const budgetVsActualQueries = {
  all: () => ['budgetVsActual'] as const,
  detail: (budgetPeriodId: string) =>
    queryOptions({
      queryFn: () => getBudgetVsActual({ data: { budgetPeriodId } }),
      queryKey: [...budgetVsActualQueries.all(), 'detail', budgetPeriodId],
    }),
};

export function useCreateBudgetPeriod() {
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['budgets.toast.periodCreateError'],
    invalidate: [budgetPeriodQueries.all()],
    mutationFn: (data: CreateBudgetPeriodInput) => createBudgetPeriod({ data }),
    mutationKey: ['budgetPeriod', 'create'],
    onSuccess: () => {
      capture('budget_period_created');
    },
    successMessage: m['budgets.toast.periodCreateSuccess'],
  });
}

export function useUpdateBudgetPeriod() {
  return useResourceMutation({
    errorMessage: m['budgets.toast.periodUpdateError'],
    invalidate: [budgetPeriodQueries.all(), budgetVsActualQueries.all()],
    mutationFn: (data: UpdateBudgetPeriodInput) => updateBudgetPeriod({ data }),
    mutationKey: ['budgetPeriod', 'update'],
    successMessage: m['budgets.toast.periodUpdateSuccess'],
  });
}

export function useDeleteBudgetPeriod() {
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['budgets.toast.periodDeleteError'],
    invalidate: [
      budgetPeriodQueries.all(),
      budgetLineQueries.all(),
      budgetVsActualQueries.all(),
    ],
    mutationFn: (data: DeleteBudgetPeriodInput) => deleteBudgetPeriod({ data }),
    mutationKey: ['budgetPeriod', 'delete'],
    onSuccess: () => {
      capture('budget_period_deleted');
    },
    successMessage: m['budgets.toast.periodDeleteSuccess'],
  });
}

export function useCopyBudgetPeriod() {
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['budgets.toast.periodCopyError'],
    invalidate: [
      budgetPeriodQueries.all(),
      budgetLineQueries.all(),
      budgetVsActualQueries.all(),
    ],
    mutationFn: (data: CopyBudgetPeriodInput) => copyBudgetPeriod({ data }),
    mutationKey: ['budgetPeriod', 'copy'],
    onSuccess: () => {
      capture('budget_period_copied');
    },
    successMessage: m['budgets.toast.periodCopySuccess'],
  });
}

export function useCreateBudgetLine() {
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['budgets.toast.lineCreateError'],
    invalidate: [budgetLineQueries.all(), budgetVsActualQueries.all()],
    mutationFn: (data: CreateBudgetLineInput) => createBudgetLine({ data }),
    mutationKey: ['budgetLine', 'create'],
    onSuccess: () => {
      capture('budget_line_created');
    },
    successMessage: m['budgets.toast.lineCreateSuccess'],
  });
}

export function useUpdateBudgetLine() {
  return useResourceMutation({
    errorMessage: m['budgets.toast.lineUpdateError'],
    invalidate: [budgetLineQueries.all(), budgetVsActualQueries.all()],
    mutationFn: (data: UpdateBudgetLineInput) => updateBudgetLine({ data }),
    mutationKey: ['budgetLine', 'update'],
    successMessage: m['budgets.toast.lineUpdateSuccess'],
  });
}

export function useDeleteBudgetLine() {
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['budgets.toast.lineDeleteError'],
    invalidate: [budgetLineQueries.all(), budgetVsActualQueries.all()],
    mutationFn: (data: DeleteBudgetLineInput) => deleteBudgetLine({ data }),
    mutationKey: ['budgetLine', 'delete'],
    onSuccess: () => {
      capture('budget_line_deleted');
    },
    successMessage: m['budgets.toast.lineDeleteSuccess'],
  });
}
