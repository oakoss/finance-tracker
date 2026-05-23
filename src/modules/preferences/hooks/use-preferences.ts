import { queryOptions } from '@tanstack/react-query';

import type { UpdateUserPreferencesInput } from '@/modules/preferences/validators';

import { useResourceMutation } from '@/hooks/use-resource-mutation';
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
  return useResourceMutation({
    errorMessage: m['preferences.toast.updateError'],
    invalidate: [preferencesQueries.all()],
    mutationFn: (data: UpdateUserPreferencesInput) =>
      updateUserPreferences({ data }),
    mutationKey: ['preferences', 'update'],
    onSuccess: () => {
      options?.onSuccess?.();
    },
    successMessage: m['preferences.toast.updateSuccess'],
  });
}
