import { TanStackDevtools } from '@tanstack/react-devtools';
import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';
import { ThemeProvider } from 'next-themes';

import Header from '@/components/header';
import { devtoolsPlugins } from '@/lib/devtools';
import { getLocale } from '@/paraglide/runtime';
import globalsCss from '@/styles/globals.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TanStack Start Starter',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: globalsCss,
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang={getLocale()}>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider
          disableTransitionOnChange
          enableSystem
          attribute="class"
          defaultTheme="system"
        >
          <Header />
          {/* Main content wrapper */}
          <main id="root-content">{children}</main>
          {/* Portal root for overlays */}
          <div id="portal-root"></div>
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={devtoolsPlugins}
          />
          <Scripts />
        </ThemeProvider>
      </body>
    </html>
  );
}
