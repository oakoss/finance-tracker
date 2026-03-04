import type { LinkProps } from '@tanstack/react-router';

import * as React from 'react';

import {
  RouterSidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    icon: React.ReactNode;
    title: string;
    url: NonNullable<LinkProps['to']>;
  }[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <RouterSidebarMenuButton
                activeProps={{ isActive: true }}
                to={item.url}
                tooltip={item.title}
              >
                {item.icon}
                <span>{item.title}</span>
              </RouterSidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
