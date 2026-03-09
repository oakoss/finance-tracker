import '@/configs/arktype';

import type { QueryClient } from '@tanstack/react-query';

import { TanStackDevtools } from '@tanstack/react-devtools';
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
import { Toaster } from '@/components/ui/sonner';
import { appConfig } from '@/configs/app';
import { useAutomatedBrowser } from '@/hooks/use-automated-browser';
import { useHydratedAttribute } from '@/hooks/use-hydrated';
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
      {
        href: '/logo.svg',
        media: '(prefers-color-scheme: light)',
        rel: 'icon',
        type: 'image/svg+xml',
      },
      {
        href: '/logo-dark.svg',
        media: '(prefers-color-scheme: dark)',
        rel: 'icon',
        type: 'image/svg+xml',
      },
      {
        href: '/logo192.png',
        rel: 'apple-touch-icon',
      },
      {
        href: '/manifest.json',
        rel: 'manifest',
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
      <body className="relative">
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
  useHydratedAttribute();
  const isAutomated = useAutomatedBrowser();

  return (
    <ThemeProvider
      disableTransitionOnChange
      enableSystem
      attribute="class"
      defaultTheme="system"
    >
      <div className="isolate relative flex min-h-svh flex-col">
        <Outlet />
      </div>
      <Toaster />
      {!isAutomated && (
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={devtoolsPlugins}
        />
      )}
    </ThemeProvider>
  );
}
