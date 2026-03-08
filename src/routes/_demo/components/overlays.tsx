import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';
import { toast } from 'sonner';

import { Icons } from '@/components/icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { ConfirmDestructiveDialog } from '@/components/ui/confirm-destructive-dialog';
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Section, Subsection } from '@/routes/_demo/components/-shared';

export const Route = createFileRoute('/_demo/components/overlays')({
  component: OverlaysPage,
});

const TOAST_VARIANTS = [
  { fn: toast, label: 'Default', message: 'Default toast message' },
  {
    fn: toast.success,
    label: 'Success',
    message: 'Operation completed successfully',
  },
  { fn: toast.error, label: 'Error', message: 'Something went wrong' },
  { fn: toast.warning, label: 'Warning', message: 'Please review your input' },
  { fn: toast.info, label: 'Info', message: 'New update available' },
] as const;

function OverlaysPage() {
  const [cmCheckboxOne, setCmCheckboxOne] = React.useState(true);
  const [cmCheckboxTwo, setCmCheckboxTwo] = React.useState(false);
  const [cmRadioValue, setCmRadioValue] = React.useState('comfortable');

  const [dmCheckboxOne, setDmCheckboxOne] = React.useState(true);
  const [dmCheckboxTwo, setDmCheckboxTwo] = React.useState(false);
  const [dmRadioValue, setDmRadioValue] = React.useState('comfortable');

  return (
    <div className="space-y-10">
      <Section title="Dialog">
        <Subsection label="Default">
          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>
              Open dialog
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit profile</DialogTitle>
                <DialogDescription>
                  Make changes to your profile here. Click save when you are
                  done.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="demo-name">Name</Label>
                  <Input defaultValue="Jane Doe" id="demo-name" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="demo-email">Email</Label>
                  <Input
                    defaultValue="jane@example.com"
                    id="demo-email"
                    type="email"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button>Save changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Subsection>

        <Subsection label="Without close button">
          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>
              No close button
            </DialogTrigger>
            <DialogContent showCloseButton={false}>
              <DialogHeader>
                <DialogTitle>Minimal dialog</DialogTitle>
                <DialogDescription>
                  This dialog has no close button in the corner.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter showCloseButton>
                <Button>Confirm</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Subsection>
      </Section>

      <Section title="AlertDialog">
        <Subsection label="Default">
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" />}>
              Delete account
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  your account and remove your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Subsection>

        <Subsection label="Size sm">
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="outline" />}>
              Confirm action
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to proceed?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Subsection>

        <Subsection label="With media">
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="outline" />}>
              With icon
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogMedia>
                  <Icons.TriangleAlert className="text-destructive" />
                </AlertDialogMedia>
                <AlertDialogTitle>Discard changes?</AlertDialogTitle>
                <AlertDialogDescription>
                  You have unsaved changes that will be lost if you leave this
                  page.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep editing</AlertDialogCancel>
                <AlertDialogAction variant="destructive">
                  Discard
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Subsection>
      </Section>

      <Section title="Sheet">
        <Subsection label="Sides">
          {(['right', 'left', 'top', 'bottom'] as const).map((side) => (
            <Sheet key={side}>
              <SheetTrigger render={<Button variant="outline" />}>
                {side}
              </SheetTrigger>
              <SheetContent side={side}>
                <SheetHeader>
                  <SheetTitle>Sheet ({side})</SheetTitle>
                  <SheetDescription>
                    This sheet slides in from the {side}.
                  </SheetDescription>
                </SheetHeader>
                <div className="flex-1 p-4">
                  <p className="text-sm text-muted-foreground">
                    Sheet content goes here.
                  </p>
                </div>
                <SheetFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button>Save</Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          ))}
        </Subsection>
      </Section>

      <Section title="Drawer">
        <Subsection label="Bottom (swipeable)">
          <Drawer direction="bottom">
            <DrawerTrigger render={<Button variant="outline" />}>
              Open drawer
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Move goal</DrawerTitle>
                <DrawerDescription>
                  Set your daily activity goal.
                </DrawerDescription>
              </DrawerHeader>
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  Swipe down to dismiss.
                </p>
              </div>
              <DrawerFooter>
                <Button>Submit</Button>
                <DrawerClose render={<Button variant="outline" />}>
                  Cancel
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </Subsection>

        <Subsection label="Right">
          <Drawer direction="right">
            <DrawerTrigger render={<Button variant="outline" />}>
              Right drawer
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Settings</DrawerTitle>
                <DrawerDescription>Adjust your preferences.</DrawerDescription>
              </DrawerHeader>
              <div className="flex-1 p-4">
                <p className="text-sm text-muted-foreground">
                  Drawer content here.
                </p>
              </div>
              <DrawerFooter>
                <DrawerClose render={<Button variant="outline" />}>
                  Close
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </Subsection>
      </Section>

      <Section title="Popover">
        <Subsection label="Default">
          <Popover>
            <PopoverTrigger render={<Button variant="outline" />}>
              Open popover
            </PopoverTrigger>
            <PopoverContent>
              <PopoverHeader>
                <PopoverTitle>Dimensions</PopoverTitle>
                <PopoverDescription>
                  Set the dimensions for the layer.
                </PopoverDescription>
              </PopoverHeader>
              <div className="grid gap-2">
                <div className="grid grid-cols-3 items-center gap-2">
                  <Label htmlFor="pop-width">Width</Label>
                  <Input
                    className="col-span-2"
                    defaultValue="100%"
                    id="pop-width"
                  />
                </div>
                <div className="grid grid-cols-3 items-center gap-2">
                  <Label htmlFor="pop-height">Height</Label>
                  <Input
                    className="col-span-2"
                    defaultValue="25px"
                    id="pop-height"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </Subsection>
      </Section>

      <Section title="Tooltip">
        <Subsection label="Sides">
          <TooltipProvider>
            {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
              <Tooltip key={side}>
                <TooltipTrigger render={<Button variant="outline" />}>
                  {side}
                </TooltipTrigger>
                <TooltipContent side={side}>Tooltip on {side}</TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </Subsection>
      </Section>

      <Section title="HoverCard">
        <Subsection label="Default">
          <HoverCard>
            <HoverCardTrigger
              render={
                <button
                  className="text-sm font-medium underline underline-offset-4"
                  type="button"
                />
              }
            >
              @jacebabin
            </HoverCardTrigger>
            <HoverCardContent>
              <div className="flex gap-3">
                <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-full">
                  <Icons.User className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">@jacebabin</p>
                  <p className="text-muted-foreground text-xs">
                    Building finance tools for families.
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Joined December 2024
                  </p>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </Subsection>
      </Section>

      <Section title="DropdownMenu">
        <Subsection label="Default">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              Open menu
              <Icons.ChevronDown data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuItem>
                  <Icons.User />
                  Profile
                  <DropdownMenuShortcut>Ctrl+P</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Icons.Settings />
                  Settings
                  <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Icons.Users />
                  Invite users
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>
                    <Icons.Mail />
                    Email
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Icons.ExternalLink />
                    Copy link
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <Icons.Trash2 />
                Delete
                <DropdownMenuShortcut>Ctrl+D</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Subsection>

        <Subsection label="With checkboxes and radios">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              Preferences
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <DropdownMenuLabel>Appearance</DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={dmCheckboxOne}
                  onCheckedChange={setDmCheckboxOne}
                >
                  Show toolbar
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={dmCheckboxTwo}
                  onCheckedChange={setDmCheckboxTwo}
                >
                  Show sidebar
                </DropdownMenuCheckboxItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Density</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={dmRadioValue}
                  onValueChange={setDmRadioValue}
                >
                  <DropdownMenuRadioItem value="compact">
                    Compact
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="comfortable">
                    Comfortable
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="spacious">
                    Spacious
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </Subsection>
      </Section>

      <Section title="Command">
        <Subsection className="block max-w-sm" label="Inline">
          <Command className="rounded-lg border">
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Suggestions">
                <CommandItem>
                  <Icons.Calendar />
                  Calendar
                </CommandItem>
                <CommandItem>
                  <Icons.Search />
                  Search transactions
                </CommandItem>
                <CommandItem>
                  <Icons.Settings />
                  Settings
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Actions">
                <CommandItem>
                  <Icons.Plus />
                  New transaction
                  <CommandShortcut>Ctrl+N</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <Icons.Upload />
                  Import CSV
                  <CommandShortcut>Ctrl+I</CommandShortcut>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </Subsection>
      </Section>

      <Section title="ConfirmDestructiveDialog">
        <Subsection label="Default">
          <ConfirmDestructiveDialog
            confirmPhrase="delete my account"
            description="This action cannot be undone. All data will be permanently removed."
            title="Delete account"
            trigger={<Button variant="destructive">Delete account</Button>}
            onConfirm={() => toast.success('Confirmed!')}
          />
        </Subsection>
      </Section>

      <Section title="Toast (Sonner)">
        <Subsection label="Variants">
          {TOAST_VARIANTS.map(({ fn, label, message }) => (
            <Button key={label} variant="outline" onClick={() => fn(message)}>
              {label}
            </Button>
          ))}
        </Subsection>

        <Subsection label="With description">
          <Button
            variant="outline"
            onClick={() =>
              toast.success('Transaction saved', {
                description: 'Your transaction has been recorded.',
              })
            }
          >
            With description
          </Button>
        </Subsection>

        <Subsection label="With action">
          <Button
            variant="outline"
            onClick={() =>
              toast('Transaction deleted', {
                action: {
                  label: 'Undo',
                  onClick: () => toast.info('Undone!'),
                },
              })
            }
          >
            With action
          </Button>
        </Subsection>
      </Section>

      <Section title="ContextMenu">
        <Subsection className="block" label="Default">
          <ContextMenu>
            <ContextMenuTrigger
              render={
                <div className="flex h-32 w-full max-w-sm items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground" />
              }
            >
              Right click here
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem>
                <Icons.ArrowLeft />
                Back
                <ContextMenuShortcut>Alt+Left</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuItem>
                <Icons.ArrowRight />
                Forward
                <ContextMenuShortcut>Alt+Right</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuItem>
                <Icons.RefreshCw />
                Reload
                <ContextMenuShortcut>Ctrl+R</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <Icons.Star />
                  Bookmarks
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItem>Show all</ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem>Finance Tracker</ContextMenuItem>
                  <ContextMenuItem>GitHub</ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
              <ContextMenuSeparator />
              <ContextMenuCheckboxItem
                checked={cmCheckboxOne}
                onCheckedChange={setCmCheckboxOne}
              >
                Show bookmarks bar
              </ContextMenuCheckboxItem>
              <ContextMenuCheckboxItem
                checked={cmCheckboxTwo}
                onCheckedChange={setCmCheckboxTwo}
              >
                Show full URLs
              </ContextMenuCheckboxItem>
              <ContextMenuSeparator />
              <ContextMenuGroup>
                <ContextMenuLabel>View</ContextMenuLabel>
                <ContextMenuRadioGroup
                  value={cmRadioValue}
                  onValueChange={setCmRadioValue}
                >
                  <ContextMenuRadioItem value="compact">
                    Compact
                  </ContextMenuRadioItem>
                  <ContextMenuRadioItem value="comfortable">
                    Comfortable
                  </ContextMenuRadioItem>
                </ContextMenuRadioGroup>
              </ContextMenuGroup>
            </ContextMenuContent>
          </ContextMenu>
        </Subsection>
      </Section>
    </div>
  );
}
