'use client';

import { TanStackDevtools } from '@tanstack/react-devtools';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';

import { useAutomatedBrowser } from '@/hooks/use-automated-browser';

const devtoolsPlugins = [
  { name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> },
  { name: 'Tanstack Query', render: <ReactQueryDevtoolsPanel /> },
];

function DevtoolsProvider() {
  const isAutomated = useAutomatedBrowser();
  if (isAutomated) return null;
  // Fragment is the load-bearing piece — devtools-vite 0.7.0 strips the
  // <TanStackDevtools> child during prod build but leaves the wrapping
  // expression. Without the fragment the strip yields `return ();`,
  // which fails the Babel parse. Remove once TanStack/devtools#444 lands.
  return (
    <>
      <TanStackDevtools
        config={{ position: 'bottom-right' }}
        plugins={devtoolsPlugins}
      />
    </>
  );
}

export { DevtoolsProvider };
