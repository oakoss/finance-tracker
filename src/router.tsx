import { createRouter } from '@tanstack/react-router';

import { NotFound } from '@/components/errors/not-found';
import { RootErrorBoundary } from '@/components/errors/root-error-boundary';
import { routeTree } from '@/routeTree.gen';

export function getRouter() {
  return createRouter({
    defaultErrorComponent: RootErrorBoundary,
    defaultNotFoundComponent: NotFound,
    routeTree,
    scrollRestoration: true,
  });
}
