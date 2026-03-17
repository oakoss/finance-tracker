import { createFileRoute, Outlet } from '@tanstack/react-router';

import { DefaultShell } from '@/components/layouts/shells/default-shell';

export const Route = createFileRoute('/_public')({ component: PublicLayout });

function PublicLayout() {
  return (
    <DefaultShell>
      <Outlet />
    </DefaultShell>
  );
}
