'use client';

import { useTheme } from 'next-themes';
import { useState } from 'react';

import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useSignOut } from '@/modules/auth/hooks/use-sign-out';
import { PreferencesDialog } from '@/modules/preferences/components/preferences-dialog';
import { m } from '@/paraglide/messages';

function ThemeIcon({ theme }: { theme: string | undefined }) {
  if (theme === 'dark') return <Icons.Moon />;
  if (theme === 'light') return <Icons.Sun />;
  return <Icons.Monitor />;
}

function getInitials(name: string): string {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return initials || '?';
}

export function NavUser({
  user,
}: {
  user: { avatar?: string | undefined; email: string; name: string };
}) {
  const { isMobile } = useSidebar();
  const { setTheme, theme } = useTheme();
  const handleSignOut = useSignOut();
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton className="aria-expanded:bg-muted" size="lg" />
            }
          >
            <Avatar className="size-8 after:hidden">
              <AvatarImage alt={user.name} src={user.avatar} />
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm/tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
            <Icons.EllipsisVertical className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-56"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8 after:hidden">
                    <AvatarImage alt={user.name} src={user.avatar} />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm/tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setPreferencesOpen(true)}>
              <Icons.Settings />
              {m['nav.preferences']()}
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ThemeIcon theme={theme} />
                {m['nav.theme']()}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent sideOffset={8}>
                <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                  <DropdownMenuRadioItem value="light">
                    <Icons.Sun />
                    {m['nav.theme.light']()}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    <Icons.Moon />
                    {m['nav.theme.dark']()}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    <Icons.Monitor />
                    {m['nav.theme.system']()}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <Icons.LogOut />
              {m['nav.signOut']()}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <PreferencesDialog
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
      />
    </SidebarMenu>
  );
}
