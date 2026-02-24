import { TanStackDevtools } from '@tanstack/react-devtools';
import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  type ErrorComponentProps,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router';
import { ThemeProvider } from 'next-themes';

import { NotFound } from '@/components/errors/not-found';
import { RootErrorBoundary } from '@/components/errors/root-error-boundary';
import { DefaultShell } from '@/components/layouts/shells/default-shell';
import { appConfig } from '@/configs/app';
import { devtoolsPlugins } from '@/lib/devtools';
import { getLocale } from '@/paraglide/runtime';
import globalsCss from '@/styles/globals.css?url';

type RouterContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  errorComponent: RootError,
  head: () => ({
    links: [
      {
        href: globalsCss,
        rel: 'stylesheet',
      },
    ],
    meta: [
      {
        charSet: 'utf8',
      },
      {
        content: 'width=device-width, initial-scale=1',
        name: 'viewport',
      },
      {
        title: appConfig.name,
      },
    ],
  }),
  notFoundComponent: RootNotFound,
  shellComponent: RootShell,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang={getLocale()}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootNotFound() {
  return (
    <DefaultShell>
      <NotFound />
    </DefaultShell>
  );
}

function RootError(props: ErrorComponentProps) {
  return (
    <DefaultShell>
      <RootErrorBoundary {...props} />
    </DefaultShell>
  );
}

function RootComponent() {
  return (
    <ThemeProvider
      disableTransitionOnChange
      enableSystem
      attribute="class"
      defaultTheme="system"
    >
      <div className="isolate">
        <Outlet />
      </div>
      <TanStackDevtools
        config={{
          position: 'bottom-right',
        }}
        plugins={devtoolsPlugins}
      />
    </ThemeProvider>
  );
}
