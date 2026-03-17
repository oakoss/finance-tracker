import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';

import type {
  CopyBudgetPeriodInput,
  CreateBudgetLineInput,
  CreateBudgetPeriodInput,
  DeleteBudgetLineInput,
  DeleteBudgetPeriodInput,
  UpdateBudgetLineInput,
  UpdateBudgetPeriodInput,
} from '@/modules/budgets/validators';

import { clientLog } from '@/lib/logging/client-logger';
import { parseError } from '@/lib/logging/evlog';
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

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Period mutations
// ---------------------------------------------------------------------------

export function useCreateBudgetPeriod() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: CreateBudgetPeriodInput) => createBudgetPeriod({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'budgetPeriod.create.failed', error });
      toast.error(m['budgets.toast.periodCreateError'](), {
        description: parsed.fix ?? parsed.why,
      });
    },
    onSuccess: () => {
      toast.success(m['budgets.toast.periodCreateSuccess']());
      void queryClient.invalidateQueries({
        queryKey: budgetPeriodQueries.all(),
      });
      void router.invalidate();
    },
  });
}

export function useUpdateBudgetPeriod() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: UpdateBudgetPeriodInput) => updateBudgetPeriod({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'budgetPeriod.update.failed', error });
      toast.error(m['budgets.toast.periodUpdateError'](), {
        description: parsed.fix ?? parsed.why,
      });
    },
    onSuccess: () => {
      toast.success(m['budgets.toast.periodUpdateSuccess']());
      void queryClient.invalidateQueries({
        queryKey: budgetPeriodQueries.all(),
      });
      void queryClient.invalidateQueries({
        queryKey: budgetVsActualQueries.all(),
      });
      void router.invalidate();
    },
  });
}

export function useDeleteBudgetPeriod() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: DeleteBudgetPeriodInput) => deleteBudgetPeriod({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'budgetPeriod.delete.failed', error });
      toast.error(m['budgets.toast.periodDeleteError'](), {
        description: parsed.fix ?? parsed.why,
      });
    },
    onSuccess: () => {
      toast.success(m['budgets.toast.periodDeleteSuccess']());
      void queryClient.invalidateQueries({
        queryKey: budgetPeriodQueries.all(),
      });
      void queryClient.invalidateQueries({ queryKey: budgetLineQueries.all() });
      void queryClient.invalidateQueries({
        queryKey: budgetVsActualQueries.all(),
      });
      void router.invalidate();
    },
  });
}

export function useCopyBudgetPeriod() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: CopyBudgetPeriodInput) => copyBudgetPeriod({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'budgetPeriod.copy.failed', error });
      toast.error(m['budgets.toast.periodCopyError'](), {
        description: parsed.fix ?? parsed.why,
      });
    },
    onSuccess: () => {
      toast.success(m['budgets.toast.periodCopySuccess']());
      void queryClient.invalidateQueries({
        queryKey: budgetPeriodQueries.all(),
      });
      void queryClient.invalidateQueries({ queryKey: budgetLineQueries.all() });
      void queryClient.invalidateQueries({
        queryKey: budgetVsActualQueries.all(),
      });
      void router.invalidate();
    },
  });
}

// ---------------------------------------------------------------------------
// Line mutations
// ---------------------------------------------------------------------------

export function useCreateBudgetLine() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: CreateBudgetLineInput) => createBudgetLine({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'budgetLine.create.failed', error });
      toast.error(m['budgets.toast.lineCreateError'](), {
        description: parsed.fix ?? parsed.why,
      });
    },
    onSuccess: () => {
      toast.success(m['budgets.toast.lineCreateSuccess']());
      void queryClient.invalidateQueries({ queryKey: budgetLineQueries.all() });
      void queryClient.invalidateQueries({
        queryKey: budgetVsActualQueries.all(),
      });
      void router.invalidate();
    },
  });
}

export function useUpdateBudgetLine() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: UpdateBudgetLineInput) => updateBudgetLine({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'budgetLine.update.failed', error });
      toast.error(m['budgets.toast.lineUpdateError'](), {
        description: parsed.fix ?? parsed.why,
      });
    },
    onSuccess: () => {
      toast.success(m['budgets.toast.lineUpdateSuccess']());
      void queryClient.invalidateQueries({ queryKey: budgetLineQueries.all() });
      void queryClient.invalidateQueries({
        queryKey: budgetVsActualQueries.all(),
      });
      void router.invalidate();
    },
  });
}

export function useDeleteBudgetLine() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: DeleteBudgetLineInput) => deleteBudgetLine({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'budgetLine.delete.failed', error });
      toast.error(m['budgets.toast.lineDeleteError'](), {
        description: parsed.fix ?? parsed.why,
      });
    },
    onSuccess: () => {
      toast.success(m['budgets.toast.lineDeleteSuccess']());
      void queryClient.invalidateQueries({ queryKey: budgetLineQueries.all() });
      void queryClient.invalidateQueries({
        queryKey: budgetVsActualQueries.all(),
      });
      void router.invalidate();
    },
  });
}
