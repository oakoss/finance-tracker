'use client';

import { DrawerPreview as DrawerPrimitive } from '@base-ui/react/drawer';
import * as React from 'react';

import { cn } from '@/lib/utils';

function Drawer({
  direction,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root> & {
  direction?: 'bottom' | 'left' | 'right' | 'top';
}) {
  const swipeDirection =
    direction === 'bottom' ? 'down' : direction === 'top' ? 'up' : direction;
  return (
    <DrawerPrimitive.Root
      data-slot="drawer"
      swipeDirection={swipeDirection}
      {...props}
    />
  );
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Backdrop>) {
  return (
    <DrawerPrimitive.Backdrop
      className={cn(
        'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-black/10 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 z-50',
        className,
      )}
      data-slot="drawer-overlay"
      {...props}
    />
  );
}

function DrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Viewport
        className="fixed inset-0 z-50"
        data-slot="drawer-viewport"
      >
        <DrawerPrimitive.Popup
          className={cn(
            'before:bg-background before:border-border flex h-auto flex-col bg-transparent p-4 before:absolute before:inset-2 before:-z-10 before:rounded-lg before:border data-[swipe-direction=down]:inset-x-0 data-[swipe-direction=down]:bottom-0 data-[swipe-direction=down]:mt-24 data-[swipe-direction=down]:max-h-[80vh] data-[swipe-direction=left]:inset-y-0 data-[swipe-direction=left]:start-0 data-[swipe-direction=left]:w-3/4 data-[swipe-direction=right]:inset-y-0 data-[swipe-direction=right]:end-0 data-[swipe-direction=right]:w-3/4 data-[swipe-direction=up]:inset-x-0 data-[swipe-direction=up]:top-0 data-[swipe-direction=up]:mb-24 data-[swipe-direction=up]:max-h-[80vh] data-[swipe-direction=left]:sm:max-w-sm data-[swipe-direction=right]:sm:max-w-sm group/drawer-popup fixed z-50',
            className,
          )}
          data-slot="drawer-popup"
        >
          <div className="bg-muted mt-4 h-1 w-25 rounded-full mx-auto hidden shrink-0 group-data-[swipe-direction=down]/drawer-popup:block" />
          <DrawerPrimitive.Content
            className="flex flex-col text-sm"
            data-slot="drawer-content"
            {...props}
          >
            {children}
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'gap-0.5 p-4 group-data-[swipe-direction=down]/drawer-popup:text-center group-data-[swipe-direction=up]/drawer-popup:text-center md:gap-0.5 md:text-start flex flex-col',
        className,
      )}
      data-slot="drawer-header"
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('gap-2 p-4 mt-auto flex flex-col', className)}
      data-slot="drawer-footer"
      {...props}
    />
  );
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      className={cn('text-foreground text-base font-medium', className)}
      data-slot="drawer-title"
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      className={cn('text-muted-foreground text-sm', className)}
      data-slot="drawer-description"
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
};
