import { queryOptions } from '@tanstack/react-query';

import { getLinkedAccounts } from '@/modules/auth/api/get-linked-accounts';

export const linkedAccountQueries = {
  all: () => ['auth', 'linked-accounts'] as const,
  list: () =>
    queryOptions({
      queryFn: () => getLinkedAccounts(),
      queryKey: [...linkedAccountQueries.all(), 'list'],
    }),
};
