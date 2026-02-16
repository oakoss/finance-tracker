'use client';

import { Link, type LinkProps } from '@tanstack/react-router';
import * as React from 'react';

import { Icons } from '@/components/icons';
import { NavDocuments } from '@/components/nav/nav-documents';
import { NavMain } from '@/components/nav/nav-main';
import { NavSecondary } from '@/components/nav/nav-secondary';
import { NavUser } from '@/components/nav/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

type SidebarLink = NonNullable<LinkProps['to']>;

type SidebarData = {
  documents: { icon: React.ReactNode; name: string; url: SidebarLink }[];
  navClouds: {
    icon: React.ReactNode;
    isActive?: boolean;
    items: { title: string; url: SidebarLink }[];
    title: string;
    url: SidebarLink;
  }[];
  navMain: { icon: React.ReactNode; title: string; url: SidebarLink }[];
  navSecondary: {
    icon: React.ReactNode;
    title: string;
    url: SidebarLink;
  }[];
  user: { avatar: string; email: string; name: string };
};

const data: SidebarData = {
  documents: [
    {
      icon: <Icons.Database />,
      name: 'Data Library',
      url: '/demo/dashboard',
    },
    {
      icon: <Icons.FileChartColumn />,
      name: 'Reports',
      url: '/demo/dashboard',
    },
    {
      icon: <Icons.File />,
      name: 'Word Assistant',
      url: '/demo/dashboard',
    },
  ],
  navClouds: [
    {
      icon: <Icons.Camera />,
      isActive: true,
      items: [
        {
          title: 'Active Proposals',
          url: '/demo/dashboard',
        },
        {
          title: 'Archived',
          url: '/demo/dashboard',
        },
      ],
      title: 'Capture',
      url: '/demo/dashboard',
    },
    {
      icon: <Icons.FileText />,
      items: [
        {
          title: 'Active Proposals',
          url: '/demo/dashboard',
        },
        {
          title: 'Archived',
          url: '/demo/dashboard',
        },
      ],
      title: 'Proposal',
      url: '/demo/dashboard',
    },
    {
      icon: <Icons.FileText />,
      items: [
        {
          title: 'Active Proposals',
          url: '/demo/dashboard',
        },
        {
          title: 'Archived',
          url: '/demo/dashboard',
        },
      ],
      title: 'Prompts',
      url: '/demo/dashboard',
    },
  ],
  navMain: [
    {
      icon: <Icons.LayoutDashboard />,
      title: 'Dashboard',
      url: '/demo/dashboard',
    },
    {
      icon: <Icons.List />,
      title: 'Lifecycle',
      url: '/demo/dashboard',
    },
    {
      icon: <Icons.ChartBar />,
      title: 'Analytics',
      url: '/demo/dashboard',
    },
    {
      icon: <Icons.Folder />,
      title: 'Projects',
      url: '/demo/dashboard',
    },
    {
      icon: <Icons.Users />,
      title: 'Team',
      url: '/demo/dashboard',
    },
  ],
  navSecondary: [
    {
      icon: <Icons.Settings2 />,
      title: 'Settings',
      url: '/demo/dashboard',
    },
    {
      icon: <Icons.CircleHelp />,
      title: 'Get Help',
      url: '/demo/dashboard',
    },
    {
      icon: <Icons.Search />,
      title: 'Search',
      url: '/demo/dashboard',
    },
  ],
  user: {
    avatar: '/avatars/shadcn.jpg',
    email: 'm@example.com',
    name: 'shadcn',
  },
};
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link to="/demo/dashboard" />}
            >
              <Icons.Command className="size-5!" />
              <span className="text-base font-semibold">Acme Inc.</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary className="mt-auto" items={data.navSecondary} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
