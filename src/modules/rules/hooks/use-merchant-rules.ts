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

function useInvalidateList() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return () => {
    void queryClient.invalidateQueries({ queryKey: merchantRuleQueries.all() });
    void router.invalidate();
  };
}

export function useCreateMerchantRule() {
  const navigate = useNavigate();
  const invalidate = useInvalidateList();
  const { capture } = useAnalytics();

  return useMutation({
    mutationFn: (data: CreateMerchantRuleInput) => createMerchantRule({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'merchantRule.create.failed', error });
      toast.error(m['rules.toast.createError'](), {
        description: parsed.fix ?? parsed.why ?? m['auth.error.unexpected'](),
      });
    },
    onSuccess: (_data, variables) => {
      toast.success(m['rules.toast.createSuccess']());
      void navigate({ search: {}, to: '/rules' });
      invalidate();
      capture('merchant_rule_created', {
        action_count: variables.actions.length,
        kind: variables.match.kind,
      });
    },
  });
}

export function useUpdateMerchantRule() {
  const navigate = useNavigate();
  const invalidate = useInvalidateList();
  const { capture } = useAnalytics();

  return useMutation({
    mutationFn: (data: UpdateMerchantRuleInput) => updateMerchantRule({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'merchantRule.update.failed', error });
      toast.error(m['rules.toast.updateError'](), {
        description: parsed.fix ?? parsed.why ?? m['auth.error.unexpected'](),
      });
    },
    onSuccess: () => {
      toast.success(m['rules.toast.updateSuccess']());
      void navigate({ search: {}, to: '/rules' });
      invalidate();
      capture('merchant_rule_updated');
    },
  });
}

export function useReorderMerchantRules() {
  const invalidate = useInvalidateList();
  const { capture } = useAnalytics();

  return useMutation({
    mutationFn: (data: ReorderMerchantRulesInput) =>
      reorderMerchantRules({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'merchantRule.reorder.failed', error });
      toast.error(m['rules.toast.reorderError'](), {
        description: parsed.fix ?? parsed.why ?? m['auth.error.unexpected'](),
      });
    },
    onSuccess: (_data, variables) => {
      invalidate();
      capture('merchant_rule_reordered', {
        count: variables.orderedIds.length,
        stage: variables.stage,
      });
    },
  });
}

export function useToggleMerchantRule() {
  const invalidate = useInvalidateList();
  const { capture } = useAnalytics();

  return useMutation({
    mutationFn: (data: ToggleMerchantRuleInput) => toggleMerchantRule({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'merchantRule.toggle.failed', error });
      toast.error(m['rules.toast.toggleError'](), {
        description: parsed.fix ?? parsed.why ?? m['auth.error.unexpected'](),
      });
    },
    onSuccess: (result) => {
      invalidate();
      capture('merchant_rule_toggled', { is_active: result.isActive });
    },
  });
}

export function useDeleteMerchantRule() {
  const invalidate = useInvalidateList();
  const { capture } = useAnalytics();

  return useMutation({
    mutationFn: (data: DeleteMerchantRuleInput) => deleteMerchantRule({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'merchantRule.delete.failed', error });
      toast.error(m['rules.toast.deleteError'](), {
        description: parsed.fix ?? parsed.why ?? m['auth.error.unexpected'](),
      });
    },
    onSuccess: () => {
      toast.success(m['rules.toast.deleteSuccess']());
      invalidate();
      capture('merchant_rule_deleted');
    },
  });
}

// Keep in sync with rule_runs.undoableUntil default (now + 5 min).
const UNDO_TOAST_DURATION_MS = 5 * 60 * 1000;

export function useUndoRuleRun() {
  const invalidate = useInvalidateList();
  const { capture } = useAnalytics();

  return useMutation({
    mutationFn: (data: UndoRuleRunInput) => undoRuleRun({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'merchantRule.undo.failed', error });
      toast.error(m['rules.toast.undoError'](), {
        description: parsed.fix ?? parsed.why ?? m['auth.error.unexpected'](),
      });
    },
    onSuccess: (result) => {
      toast.success(m['rules.toast.undoSuccess']());
      invalidate();
      capture('merchant_rule_undone', { restored: result.restoredCount });
    },
  });
}

export function useApplyMerchantRule() {
  const invalidate = useInvalidateList();
  const { capture } = useAnalytics();
  const undo = useUndoRuleRun();

  return useMutation({
    mutationFn: (data: ApplyMerchantRuleInput) => applyMerchantRule({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'merchantRule.apply.failed', error });
      toast.error(m['rules.toast.applyError'](), {
        description: parsed.fix ?? parsed.why ?? m['auth.error.unexpected'](),
      });
    },
    onSuccess: (result) => {
      invalidate();
      capture('merchant_rule_applied', { count: result.count });

      // Dismiss the source toast when undo fires so the two don't coexist.
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
