'use client';

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { Icons } from '@/components/icons';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const AutocompleteAnchorContext =
  React.createContext<React.RefObject<HTMLElement | null> | null>(null);

const inputVariants = cva(
  'outline-none flex w-full text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [[readonly]]:bg-muted/80 [[readonly]]:cursor-not-allowed text-sm',
  {
    defaultVariants: {
      size: 'default',
    },
    variants: {
      size: {
        default: 'h-9 px-3',
        lg: 'h-10 px-4',
        sm: 'h-8 px-3',
      },
    },
  },
);

function Autocomplete({
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.Root>) {
  const anchorRef = React.useRef<HTMLElement | null>(null);

  return (
    <AutocompleteAnchorContext.Provider value={anchorRef}>
      <AutocompletePrimitive.Root {...props} />
    </AutocompleteAnchorContext.Provider>
  );
}

function AutocompleteValue({ ...props }: AutocompletePrimitive.Value.Props) {
  return (
    <AutocompletePrimitive.Value data-slot="autocomplete-value" {...props} />
  );
}

function AutocompleteInput({
  className,
  disabled = false,
  showClear = false,
  showTrigger = false,
  size = 'default',
  ...props
}: Omit<AutocompletePrimitive.Input.Props, 'size'> &
  VariantProps<typeof inputVariants> & {
    disabled?: boolean;
    showClear?: boolean;
    showTrigger?: boolean;
  }) {
  const anchorRef = React.use(AutocompleteAnchorContext);

  return (
    <InputGroup
      ref={anchorRef as React.Ref<HTMLFieldSetElement>}
      className={cn('w-full', className)}
    >
      <AutocompletePrimitive.Input
        render={
          <InputGroupInput
            className={cn(inputVariants({ size }))}
            disabled={disabled}
          />
        }
        {...props}
        data-size={size}
        data-slot="autocomplete-input"
      />
      <InputGroupAddon align="inline-end">
        {showTrigger ? (
          <AutocompleteTrigger disabled={disabled} size={size} />
        ) : null}
        {showClear ? (
          <AutocompleteClear disabled={disabled} size={size} />
        ) : null}
      </InputGroupAddon>
    </InputGroup>
  );
}

function AutocompleteStatus({
  className,
  ...props
}: AutocompletePrimitive.Status.Props) {
  return (
    <AutocompletePrimitive.Status
      className={cn(
        'text-muted-foreground px-3 py-2 text-sm empty:m-0 empty:p-0',
        className,
      )}
      data-slot="autocomplete-status"
      {...props}
    />
  );
}

function AutocompletePortal({ ...props }: AutocompletePrimitive.Portal.Props) {
  return (
    <AutocompletePrimitive.Portal data-slot="autocomplete-portal" {...props} />
  );
}

function AutocompleteBackdrop({
  ...props
}: AutocompletePrimitive.Backdrop.Props) {
  return (
    <AutocompletePrimitive.Backdrop
      data-slot="autocomplete-backdrop"
      {...props}
    />
  );
}

function AutocompletePositioner({
  className,
  ...props
}: AutocompletePrimitive.Positioner.Props) {
  return (
    <AutocompletePrimitive.Positioner
      className={cn('z-50 outline-none', className)}
      data-slot="autocomplete-positioner"
      {...props}
    />
  );
}

function AutocompleteList({
  className,
  scrollAreaClassName,
  ...props
}: AutocompletePrimitive.List.Props & {
  scrollAreaClassName?: string;
  scrollbarGutter?: boolean;
  scrollFade?: boolean;
}) {
  return (
    <ScrollArea
      className={cn(
        'size-full min-h-0 **:data-[slot=scroll-area-viewport]:h-full **:data-[slot=scroll-area-viewport]:overscroll-contain',
        scrollAreaClassName,
      )}
    >
      <AutocompletePrimitive.List
        className={cn(
          'no-scrollbar max-h-[min(calc(--spacing(72)---spacing(9)),calc(var(--available-height)---spacing(9)))] scroll-py-1 p-1 overflow-y-auto overscroll-contain',
          className,
        )}
        data-slot="autocomplete-list"
        {...props}
      />
    </ScrollArea>
  );
}

function AutocompleteCollection({
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.Collection>) {
  return (
    <AutocompletePrimitive.Collection
      data-slot="autocomplete-collection"
      {...props}
    />
  );
}

function AutocompleteRow({
  className,
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.Row>) {
  return (
    <AutocompletePrimitive.Row
      className={cn('flex items-center gap-2', className)}
      data-slot="autocomplete-row"
      {...props}
    />
  );
}

function AutocompleteItem({
  className,
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.Item>) {
  return (
    <AutocompletePrimitive.Item
      className={cn(
        "data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground gap-2 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex w-full cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      data-slot="autocomplete-item"
      {...props}
    />
  );
}

export type AutocompleteContentProps = {
  align?: AutocompletePrimitive.Positioner.Props['align'];
  alignOffset?: AutocompletePrimitive.Positioner.Props['alignOffset'];
  anchor?: AutocompletePrimitive.Positioner.Props['anchor'];
  showBackdrop?: boolean;
  side?: AutocompletePrimitive.Positioner.Props['side'];
  sideOffset?: AutocompletePrimitive.Positioner.Props['sideOffset'];
} & React.ComponentProps<typeof AutocompletePrimitive.Popup>;

function AutocompleteContent({
  align = 'start',
  alignOffset = 0,
  anchor,
  children,
  className,
  showBackdrop = false,
  side = 'bottom',
  sideOffset = 4,
  ...props
}: AutocompleteContentProps) {
  const anchorRef = React.use(AutocompleteAnchorContext);

  return (
    <AutocompletePortal>
      {showBackdrop ? <AutocompleteBackdrop /> : null}
      <AutocompletePositioner
        align={align}
        alignOffset={alignOffset}
        anchor={anchor ?? anchorRef}
        side={side}
        sideOffset={sideOffset}
      >
        <AutocompletePrimitive.Popup
          className={cn(
            'bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 overflow-hidden rounded-lg shadow-md ring-1 duration-100 data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2 relative max-h-(--available-height) w-(--anchor-width) min-w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin)',
            className,
          )}
          data-slot="autocomplete-popup"
          {...props}
        >
          {children}
        </AutocompletePrimitive.Popup>
      </AutocompletePositioner>
    </AutocompletePortal>
  );
}

function AutocompleteGroup({
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.Group>) {
  return (
    <AutocompletePrimitive.Group data-slot="autocomplete-group" {...props} />
  );
}

function AutocompleteGroupLabel({
  className,
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.GroupLabel>) {
  return (
    <AutocompletePrimitive.GroupLabel
      className={cn(
        'text-muted-foreground px-3 py-2.5 text-xs font-medium',
        className,
      )}
      data-slot="autocomplete-group-label"
      {...props}
    />
  );
}

function AutocompleteEmpty({
  className,
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.Empty>) {
  return (
    <AutocompletePrimitive.Empty
      className={cn(
        'text-muted-foreground px-3 py-2 text-sm text-center empty:m-0 empty:p-0',
        className,
      )}
      data-slot="autocomplete-empty"
      {...props}
    />
  );
}

function AutocompleteClear({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.Clear> &
  VariantProps<typeof inputVariants>) {
  const buttonSize = size === 'lg' ? 'icon-sm' : 'icon-xs';

  return (
    <AutocompletePrimitive.Clear
      className={cn(
        'group-has-data-[slot=autocomplete-input]/input-group:hidden data-pressed:bg-transparent',
        className,
      )}
      data-slot="autocomplete-clear"
      render={<InputGroupButton size={buttonSize} variant="ghost" />}
      {...props}
    >
      <Icons.X className="size-4" />
    </AutocompletePrimitive.Clear>
  );
}

function AutocompleteTrigger({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.Trigger> &
  VariantProps<typeof inputVariants>) {
  const buttonSize = size === 'lg' ? 'icon-sm' : 'icon-xs';

  return (
    <AutocompletePrimitive.Trigger
      className={cn(
        'group-has-data-[slot=autocomplete-clear]/input-group:hidden data-pressed:bg-transparent',
        className,
      )}
      data-slot="autocomplete-trigger"
      render={<InputGroupButton size={buttonSize} variant="ghost" />}
      {...props}
    >
      <Icons.ChevronDown className="size-4 opacity-70" />
    </AutocompletePrimitive.Trigger>
  );
}

function AutocompleteArrow({
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.Arrow>) {
  return (
    <AutocompletePrimitive.Arrow data-slot="autocomplete-arrow" {...props} />
  );
}

function AutocompleteSeparator({
  className,
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.Separator>) {
  return (
    <AutocompletePrimitive.Separator
      className={cn('bg-border/50 my-1.5 h-px', className)}
      data-slot="autocomplete-separator"
      {...props}
    />
  );
}

export {
  Autocomplete,
  AutocompleteArrow,
  AutocompleteBackdrop,
  AutocompleteClear,
  AutocompleteCollection,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteGroup,
  AutocompleteGroupLabel,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePortal,
  AutocompletePositioner,
  AutocompleteRow,
  AutocompleteSeparator,
  AutocompleteStatus,
  AutocompleteTrigger,
  AutocompleteValue,
};
