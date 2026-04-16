import { queryOptions } from '@tanstack/react-query';

import { listPayees } from '@/modules/payees/api/list-payees';

export const payeeQueries = {
  all: () => ['payees'] as const,
  list: () =>
    queryOptions({
      queryFn: () => listPayees(),
      queryKey: [...payeeQueries.all(), 'list'],
    }),
};
