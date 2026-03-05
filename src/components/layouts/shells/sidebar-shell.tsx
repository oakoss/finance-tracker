import type { CSSProperties } from 'react';

import {
  AppSidebar,
  type AppSidebarUser,
} from '@/components/layouts/app/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useSignOutListener } from '@/modules/auth/hooks/use-sign-out-listener';

const sidebarShellStyles = {
  '--header-height': '3.5rem',
} as CSSProperties;

export function SidebarShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: AppSidebarUser | undefined;
}) {
  useSignOutListener();

  return (
    <SidebarProvider style={sidebarShellStyles}>
      <AppSidebar user={user} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
