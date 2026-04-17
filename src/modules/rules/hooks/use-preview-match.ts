import { useDebouncedValue } from '@tanstack/react-pacer/debouncer';
import { useQuery } from '@tanstack/react-query';

import type { PreviewMatchMerchantRuleInput } from '@/modules/rules/validators';

import { previewMatchMerchantRule } from '@/modules/rules/api/preview-match-merchant-rule';

const DEBOUNCE_MS = 400;

export function usePreviewMatch(
  predicate: null | PreviewMatchMerchantRuleInput,
) {
  const [debounced] = useDebouncedValue(predicate, { wait: DEBOUNCE_MS });

  return useQuery({
    enabled: debounced !== null,
    gcTime: 30_000,
    queryFn: () => previewMatchMerchantRule({ data: debounced! }),
    queryKey: [
      'merchantRules',
      'previewMatch',
      debounced ? JSON.stringify(debounced) : null,
    ],
    staleTime: 30_000,
  });
}
