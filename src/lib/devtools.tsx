'use client';

import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';

const devtoolsPlugins = [
  {
    name: 'Tanstack Router',
    render: <TanStackRouterDevtoolsPanel />,
  },
  {
    name: 'Tanstack Query',
    render: <ReactQueryDevtoolsPanel />,
  },
];

export { devtoolsPlugins };
