import { useQuery } from '@tanstack/react-query';

import { previewApplyMerchantRule } from '@/modules/rules/api/preview-apply-merchant-rule';

export function usePreviewApply(ruleId: string) {
  return useQuery({
    gcTime: 30_000,
    queryFn: () => previewApplyMerchantRule({ data: { id: ruleId } }),
    queryKey: ['merchantRules', 'previewApply', ruleId],
    // Default 3x backoff stalls the dialog ~7s before surfacing the retry
    // button. One retry is enough for transient network blips.
    retry: 1,
    staleTime: 30_000,
  });
}
