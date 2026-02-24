import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';

import { NotFound } from '@/components/errors/not-found';
import { RootErrorBoundary } from '@/components/errors/root-error-boundary';
import { routeTree } from '@/routeTree.gen';

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
    },
  });

  const router = createRouter({
    context: { queryClient },
    defaultErrorComponent: RootErrorBoundary,
    defaultNotFoundComponent: NotFound,
    routeTree,
    scrollRestoration: true,
  });

  setupRouterSsrQueryIntegration({ queryClient, router });

  return router;
}
