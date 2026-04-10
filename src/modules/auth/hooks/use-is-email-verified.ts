import { useRouteContext } from '@tanstack/react-router';

/**
 * Reads `emailVerified` from the `_app` route context. The layout's
 * `beforeLoad` guarantees a session is present on any authenticated
 * route, so this hook always returns a boolean.
 *
 * Only safe to call from components mounted under the `_app/*` route
 * tree. Calling it from a `_public` or `_auth` route throws at
 * runtime because the route context isn't populated.
 */
export function useIsEmailVerified(): boolean {
  const { session } = useRouteContext({ from: '/_app' });
  return session.user.emailVerified;
}
