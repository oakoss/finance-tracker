import type React from 'react';

import { createFileRoute } from '@tanstack/react-router';

import { Icons } from '@/components/icons';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '@/components/ui/menubar';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Section, Subsection } from '@/routes/_demo/components/-shared';

export const Route = createFileRoute('/_demo/components/navigation')({
  component: NavigationPage,
});

const NAV_MENU_GETTING_STARTED = [
  {
    description: 'Learn the basics of the finance tracker.',
    title: 'Introduction',
  },
  {
    description: 'Set up your first account in minutes.',
    title: 'Quick Start',
  },
  { description: 'Import transactions from CSV files.', title: 'Import Data' },
  {
    description: 'Organize your spending with categories.',
    title: 'Categories',
  },
];

const NAV_MENU_FEATURES = [
  {
    description: 'Visualize your spending patterns.',
    icon: Icons.ChartBar,
    title: 'Reports',
  },
  {
    description: 'Set and track monthly budgets.',
    icon: Icons.CircleCheck,
    title: 'Budgets',
  },
];

const SIDEBAR_NAV = [
  { active: true, icon: Icons.LayoutDashboard, title: 'Dashboard' },
  { active: false, icon: Icons.Wallet, title: 'Accounts' },
  { active: false, icon: Icons.ArrowLeftRight, title: 'Transactions' },
  { active: false, icon: Icons.Tag, title: 'Categories' },
];

function NavigationPage() {
  return (
    <div className="space-y-10">
      <Section title="Breadcrumb">
        <Subsection className="block" label="Default">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Accounts</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Checking</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </Subsection>

        <Subsection className="block" label="With ellipsis">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbEllipsis />
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Settings</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Profile</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </Subsection>

        <Subsection className="block" label="Custom separator">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Reports</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>Monthly</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </Subsection>
      </Section>

      <Section title="NavigationMenu">
        <Subsection className="block" label="Default">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Getting Started</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid w-100 gap-1 p-2 md:w-125 md:grid-cols-2">
                    {NAV_MENU_GETTING_STARTED.map((item) => (
                      <NavigationMenuLink key={item.title} href="#">
                        <div>
                          <div className="font-medium">{item.title}</div>
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </NavigationMenuLink>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Features</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid w-75 gap-1 p-2">
                    {NAV_MENU_FEATURES.map((item) => (
                      <NavigationMenuLink key={item.title} href="#">
                        <item.icon className="text-muted-foreground" />
                        <div>
                          <div className="font-medium">{item.title}</div>
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </NavigationMenuLink>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink href="#">Documentation</NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </Subsection>
      </Section>

      <Section title="Menubar">
        <Subsection className="block" label="Default">
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger>File</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  New Transaction
                  <MenubarShortcut>Ctrl+N</MenubarShortcut>
                </MenubarItem>
                <MenubarItem>
                  New Account
                  <MenubarShortcut>Ctrl+Shift+N</MenubarShortcut>
                </MenubarItem>
                <MenubarSeparator />
                <MenubarSub>
                  <MenubarSubTrigger>Import</MenubarSubTrigger>
                  <MenubarSubContent>
                    <MenubarItem>From CSV</MenubarItem>
                    <MenubarItem>From OFX</MenubarItem>
                  </MenubarSubContent>
                </MenubarSub>
                <MenubarSeparator />
                <MenubarItem>
                  Export
                  <MenubarShortcut>Ctrl+E</MenubarShortcut>
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger>Edit</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  Undo
                  <MenubarShortcut>Ctrl+Z</MenubarShortcut>
                </MenubarItem>
                <MenubarItem>
                  Redo
                  <MenubarShortcut>Ctrl+Y</MenubarShortcut>
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem>
                  Find
                  <MenubarShortcut>Ctrl+F</MenubarShortcut>
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger>View</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>Dashboard</MenubarItem>
                <MenubarItem>Transactions</MenubarItem>
                <MenubarItem>Reports</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </Subsection>
      </Section>

      <Section title="Sidebar">
        <Subsection className="block" label="Default (non-collapsible)">
          <SidebarProvider
            className="min-h-0! max-w-xs"
            style={
              {
                '--sidebar-width': '16rem',
              } as React.CSSProperties
            }
          >
            <Sidebar collapsible="none">
              <SidebarHeader>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Icons.Logo className="size-5!" />
                      <span className="font-semibold">Finance Tracker</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarHeader>
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {SIDEBAR_NAV.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton isActive={item.active}>
                            <item.icon className="size-4" />
                            <span>{item.title}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
              <SidebarFooter>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Icons.Settings className="size-4" />
                      <span>Settings</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarFooter>
            </Sidebar>
          </SidebarProvider>
        </Subsection>

        <Subsection className="block" label="With toggle trigger">
          <SidebarProvider
            className="min-h-0! max-w-sm"
            style={
              {
                '--sidebar-width': '14rem',
              } as React.CSSProperties
            }
          >
            <Sidebar>
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {SIDEBAR_NAV.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            isActive={item.active}
                            tooltip={item.title}
                          >
                            <item.icon className="size-4" />
                            <span>{item.title}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>
            <div className="p-2">
              <SidebarTrigger />
            </div>
          </SidebarProvider>
        </Subsection>
      </Section>

      <Section title="Pagination">
        <Subsection className="block" label="Default">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">1</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink isActive href="#">
                  2
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">3</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">10</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </Subsection>
      </Section>
    </div>
  );
}
