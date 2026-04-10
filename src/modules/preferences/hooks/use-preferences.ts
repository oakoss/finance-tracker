import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';

import type { UpdateUserPreferencesInput } from '@/modules/preferences/validators';

import { clientLog } from '@/lib/logging/client-logger';
import { parseError } from '@/lib/logging/evlog';
import { getUserPreferences } from '@/modules/preferences/api/get-preferences';
import { updateUserPreferences } from '@/modules/preferences/api/update-preferences';
import { m } from '@/paraglide/messages';

export const preferencesQueries = {
  all: () => ['preferences'] as const,
  detail: () =>
    queryOptions({
      queryFn: () => getUserPreferences(),
      queryKey: [...preferencesQueries.all(), 'detail'],
    }),
};

export function useUpdateUserPreferences(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: UpdateUserPreferencesInput) =>
      updateUserPreferences({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({
        action: 'preferences.update.failed',
        error: parsed.message,
      });
      toast.error(m['preferences.toast.updateError'](), {
        description: parsed.fix ?? parsed.why ?? m['auth.error.unexpected'](),
      });
    },
    onSuccess: () => {
      toast.success(m['preferences.toast.updateSuccess']());
      void queryClient.invalidateQueries({
        queryKey: preferencesQueries.all(),
      });
      void router.invalidate();
      options?.onSuccess?.();
    },
  });
}
