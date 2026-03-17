import { Icons } from '@/components/icons';
import { NavMain } from '@/components/nav/nav-main';
import { NavSecondary } from '@/components/nav/nav-secondary';
import { NavUser } from '@/components/nav/nav-user';
import {
  RouterSidebarMenuButton,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { appConfig } from '@/configs/app';

export type AppSidebarUser = {
  avatar?: string | null | undefined;
  email: string;
  name: string;
};

const navMain = [
  {
    icon: <Icons.LayoutDashboard />,
    title: 'Dashboard',
    url: '/dashboard' as const,
  },
  { icon: <Icons.Wallet />, title: 'Accounts', url: '/accounts' as const },
  {
    icon: <Icons.ArrowLeftRight />,
    title: 'Transactions',
    url: '/transactions' as const,
  },
  { icon: <Icons.Tag />, title: 'Categories', url: '/categories' as const },
  { icon: <Icons.ChartBar />, title: 'Budgets', url: '/budgets' as const },
  { icon: <Icons.Upload />, title: 'Imports', url: '/dashboard' as const },
];

const navSecondary = [
  { icon: <Icons.Settings />, title: 'Settings', url: '/dashboard' as const },
];

export function AppSidebar({
  user,
  ...props
}: { user?: AppSidebarUser | undefined } & React.ComponentProps<
  typeof Sidebar
>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <RouterSidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              to="/dashboard"
            >
              <Icons.Logo className="size-5!" />
              <span className="text-base font-semibold">{appConfig.name}</span>
            </RouterSidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary className="mt-auto" items={navSecondary} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            avatar: user?.avatar ?? undefined,
            email: user?.email ?? '',
            name: user?.name ?? 'User',
          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
