import { createFileRoute, Link, Outlet } from '@tanstack/react-router';

import { ModeToggle } from '@/components/mode-toggle';

// Add entries here as component group pages are created.
const NAV_ITEMS = [
  { label: 'Layout', to: '/components/layout' },
  { label: 'Forms', to: '/components/forms' },
  { label: 'Selections', to: '/components/selections' },
  { label: 'Overlays', to: '/components/overlays' },
  { label: 'Data', to: '/components/data' },
] as const;

export const Route = createFileRoute('/_demo/components')({
  component: ComponentsLayout,
});

function ComponentsLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
        <div className="flex h-12 items-center gap-4 px-4 lg:px-6">
          <span className="text-sm font-semibold tracking-tight">
            Components
          </span>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.map(({ label, to }) => (
              <Link
                key={to}
                activeProps={{ className: 'bg-muted text-foreground' }}
                className="rounded-md px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                to={to}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto">
            <ModeToggle />
          </div>
        </div>
      </header>
      <main className="flex-1 px-4 py-6 lg:px-6">
        <Outlet />
      </main>
    </div>
  );
}
