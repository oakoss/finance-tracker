import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { clientLog } from '@/lib/logging/client-logger';
import { parseError } from '@/lib/logging/evlog';
import { createBudgetLine } from '@/modules/budgets/api/create-budget-line';
import { createBudgetPeriod } from '@/modules/budgets/api/create-budget-period';
import { deleteBudgetLine } from '@/modules/budgets/api/delete-budget-line';
import { updateBudgetLine } from '@/modules/budgets/api/update-budget-line';
import {
  budgetLineQueries,
  budgetPeriodQueries,
  budgetVsActualQueries,
} from '@/modules/budgets/hooks/use-budgets';
import { m } from '@/paraglide/messages';

export type SaveLine =
  | { amountCents: number; categoryId: string; op: 'create' }
  | {
      amountCents: number;
      categoryId: string;
      existingLineId: string;
      op: 'update';
    }
  | { categoryId: string; existingLineId: string; op: 'delete' };

type SaveInput = {
  existingPeriodId?: string | undefined;
  lines: SaveLine[];
  month: number;
  year: number;
};

function invalidateAll(
  queryClient: ReturnType<typeof useQueryClient>,
  router: ReturnType<typeof useRouter>,
) {
  void queryClient.invalidateQueries({
    queryKey: budgetPeriodQueries.all(),
  });
  void queryClient.invalidateQueries({
    queryKey: budgetLineQueries.all(),
  });
  void queryClient.invalidateQueries({
    queryKey: budgetVsActualQueries.all(),
  });
  void router.invalidate();
}

function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useSaveBudget() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const pendingRef = useRef(false);

  async function save(input: SaveInput): Promise<boolean> {
    if (pendingRef.current) return false;
    pendingRef.current = true;
    setIsPending(true);

    let phase: 'lines' | 'period' = 'period';
    try {
      let periodId = input.existingPeriodId;

      if (!periodId) {
        const period = await createBudgetPeriod({
          data: { month: input.month, year: input.year },
        });
        periodId = period.id;
      }

      phase = 'lines';
      const operations: Promise<unknown>[] = [];
      const operationMeta: { categoryId: string; op: string }[] = [];

      for (const line of input.lines) {
        switch (line.op) {
          case 'create': {
            operations.push(
              createBudgetLine({
                data: {
                  amountCents: line.amountCents,
                  budgetPeriodId: periodId,
                  categoryId: line.categoryId,
                },
              }),
            );
            operationMeta.push({ categoryId: line.categoryId, op: 'create' });
            break;
          }
          case 'delete': {
            operations.push(
              deleteBudgetLine({ data: { id: line.existingLineId } }),
            );
            operationMeta.push({ categoryId: line.categoryId, op: 'delete' });
            break;
          }
          case 'update': {
            operations.push(
              updateBudgetLine({
                data: {
                  amountCents: line.amountCents,
                  id: line.existingLineId,
                },
              }),
            );
            operationMeta.push({ categoryId: line.categoryId, op: 'update' });
            break;
          }
        }
      }

      const results = await Promise.allSettled(operations);
      invalidateAll(queryClient, router);

      const failedCount = results.filter((r) => r.status === 'rejected').length;

      if (failedCount > 0) {
        for (const [i, result] of results.entries()) {
          if (result.status === 'rejected') {
            clientLog.error({
              action: 'budget.save.lineFailure',
              error: extractErrorMessage(result.reason),
              meta: {
                ...operationMeta[i],
                failed: failedCount,
                total: results.length,
              },
            });
          }
        }

        const firstRejected = results.find(
          (r): r is PromiseRejectedResult => r.status === 'rejected',
        );

        if (!firstRejected) {
          toast.error(m['budgets.toast.saveError']());
          return false;
        }

        const succeeded = results.length - failedCount;

        if (succeeded > 0) {
          toast.warning(m['budgets.toast.savePartial'](), {
            description: parseError(firstRejected.reason).fix,
          });
        } else {
          toast.error(m['budgets.toast.saveError'](), {
            description: parseError(firstRejected.reason).fix,
          });
        }

        return false;
      }

      toast.success(m['budgets.toast.saveSuccess']());
      return true;
    } catch (error) {
      const parsed = parseError(error);
      clientLog.error({
        action: 'budget.save.failed',
        error: extractErrorMessage(error),
        meta: { month: input.month, phase, year: input.year },
      });
      toast.error(m['budgets.toast.saveError'](), {
        description: parsed.fix ?? parsed.why,
      });
      // Invalidate even on error — period may have been created
      invalidateAll(queryClient, router);
      return false;
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }
  }

  return { isPending, save };
}
