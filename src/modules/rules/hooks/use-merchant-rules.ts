import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';

import type {
  ApplyMerchantRuleInput,
  CreateMerchantRuleInput,
  DeleteMerchantRuleInput,
  ReorderMerchantRulesInput,
  ToggleMerchantRuleInput,
  UndoRuleRunInput,
  UpdateMerchantRuleInput,
} from '@/modules/rules/validators';

import { useAnalytics } from '@/hooks/use-analytics';
import { useResourceMutation } from '@/hooks/use-resource-mutation';
import { clientLog } from '@/lib/logging/client-logger';
import { parseError } from '@/lib/logging/evlog';
import { applyMerchantRule } from '@/modules/rules/api/apply-merchant-rule';
import { createMerchantRule } from '@/modules/rules/api/create-merchant-rule';
import { deleteMerchantRule } from '@/modules/rules/api/delete-merchant-rule';
import { listMerchantRules } from '@/modules/rules/api/list-merchant-rules';
import { reorderMerchantRules } from '@/modules/rules/api/reorder-merchant-rules';
import { toggleMerchantRule } from '@/modules/rules/api/toggle-merchant-rule';
import { undoRuleRun } from '@/modules/rules/api/undo-rule-run';
import { updateMerchantRule } from '@/modules/rules/api/update-merchant-rule';
import { m } from '@/paraglide/messages';

export const merchantRuleQueries = {
  all: () => ['merchantRules'] as const,
  list: () =>
    queryOptions({
      queryFn: () => listMerchantRules(),
      queryKey: [...merchantRuleQueries.all(), 'list'],
    }),
};

export function useCreateMerchantRule() {
  const navigate = useNavigate();
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['rules.toast.createError'],
    invalidate: [merchantRuleQueries.all()],
    mutationFn: (data: CreateMerchantRuleInput) => createMerchantRule({ data }),
    mutationKey: ['merchantRule', 'create'],
    onSuccess: (_data, variables) => {
      void navigate({ search: {}, to: '/rules' });
      capture('merchant_rule_created', {
        action_count: variables.actions.length,
        kind: variables.match.kind,
      });
    },
    successMessage: m['rules.toast.createSuccess'],
  });
}

export function useUpdateMerchantRule() {
  const navigate = useNavigate();
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['rules.toast.updateError'],
    invalidate: [merchantRuleQueries.all()],
    mutationFn: (data: UpdateMerchantRuleInput) => updateMerchantRule({ data }),
    mutationKey: ['merchantRule', 'update'],
    onSuccess: () => {
      void navigate({ search: {}, to: '/rules' });
      capture('merchant_rule_updated');
    },
    successMessage: m['rules.toast.updateSuccess'],
  });
}

export function useReorderMerchantRules() {
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['rules.toast.reorderError'],
    invalidate: [merchantRuleQueries.all()],
    mutationFn: (data: ReorderMerchantRulesInput) =>
      reorderMerchantRules({ data }),
    mutationKey: ['merchantRule', 'reorder'],
    onSuccess: (_data, variables) => {
      capture('merchant_rule_reordered', {
        count: variables.orderedIds.length,
        stage: variables.stage,
      });
    },
  });
}

export function useToggleMerchantRule() {
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['rules.toast.toggleError'],
    invalidate: [merchantRuleQueries.all()],
    mutationFn: (data: ToggleMerchantRuleInput) => toggleMerchantRule({ data }),
    mutationKey: ['merchantRule', 'toggle'],
    onSuccess: (result) => {
      capture('merchant_rule_toggled', { is_active: result.isActive });
    },
  });
}

export function useDeleteMerchantRule() {
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['rules.toast.deleteError'],
    invalidate: [merchantRuleQueries.all()],
    mutationFn: (data: DeleteMerchantRuleInput) => deleteMerchantRule({ data }),
    mutationKey: ['merchantRule', 'delete'],
    onSuccess: () => {
      capture('merchant_rule_deleted');
    },
    successMessage: m['rules.toast.deleteSuccess'],
  });
}

// Keep in sync with rule_runs.undoableUntil default (now + 5 min).
const UNDO_TOAST_DURATION_MS = 5 * 60 * 1000;

export function useUndoRuleRun() {
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['rules.toast.undoError'],
    invalidate: [merchantRuleQueries.all()],
    mutationFn: (data: UndoRuleRunInput) => undoRuleRun({ data }),
    mutationKey: ['merchantRule', 'undo'],
    onSuccess: (result) => {
      capture('merchant_rule_undone', { restored: result.restoredCount });
    },
    successMessage: m['rules.toast.undoSuccess'],
  });
}

// Stays on raw useMutation: the undo action's onClick needs the toastId
// returned by `toast.success` to call `toast.dismiss(toastId)`, and the
// wrapper discards that return value.
export function useApplyMerchantRule() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { capture } = useAnalytics();
  const undo = useUndoRuleRun();

  return useMutation({
    mutationFn: (data: ApplyMerchantRuleInput) => applyMerchantRule({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({
        action: 'merchantRule.apply.failed',
        code: parsed.code,
        errorMessage: parsed.message,
        errorStack: error instanceof Error ? error.stack : undefined,
        status: parsed.status,
      });
      if (parsed.status === 422) {
        toast.error(m['common.toast.validationError'](), {
          description:
            parsed.fix ?? m['common.toast.validationErrorDescription'](),
        });
      } else {
        toast.error(m['rules.toast.applyError'](), {
          description: parsed.fix ?? m['common.toast.tryAgainDescription'](),
        });
      }
    },
    onSuccess: (result) => {
      queryClient
        .invalidateQueries({ queryKey: merchantRuleQueries.all() })
        .catch((error: unknown) => {
          clientLog.warn({
            action: 'merchantRule.apply.invalidate.failed',
            errorMessage:
              error instanceof Error ? error.message : String(error),
          });
        });
      router.invalidate().catch((error: unknown) => {
        clientLog.warn({
          action: 'merchantRule.apply.routerInvalidate.failed',
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      });
      capture('merchant_rule_applied', { count: result.count });

      const toastId = toast.success(
        m['rules.toast.applySuccess']({ count: String(result.count) }),
        {
          action: {
            label: m['rules.toast.undoAction'](),
            onClick: () => {
              if (undo.isPending) return;
              toast.dismiss(toastId);
              undo.mutate({ runId: result.runId });
            },
          },
          duration: UNDO_TOAST_DURATION_MS,
        },
      );
    },
  });
}
