'use client';

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete';
import { cva, type VariantProps } from 'class-variance-authority';

import { Icons } from '@/components/icons';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const inputVariants = cva(
  'outline-none flex w-full text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [[readonly]]:bg-muted/80 [[readonly]]:cursor-not-allowed text-sm',
  {
    variants: {
      size: {
        default: 'h-9 px-3',
        lg: 'h-10 px-4',
        sm: 'h-8 px-3',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

const Autocomplete = AutocompletePrimitive.Root;

function AutocompleteValue({ ...props }: AutocompletePrimitive.Value.Props) {
  return (
    <AutocompletePrimitive.Value data-slot="autocomplete-value" {...props} />
  );
}

function AutocompleteInput({
  className,
  size = 'default',
  disabled = false,
  showClear = false,
  showTrigger = false,
  ...props
}: Omit<AutocompletePrimitive.Input.Props, 'size'> &
  VariantProps<typeof inputVariants> & {
    disabled?: boolean;
    showClear?: boolean;
    showTrigger?: boolean;
  }) {
  return (
    <InputGroup className={cn('w-full', className)}>
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
  scrollFade?: boolean;
  scrollbarGutter?: boolean;
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
          'no-scrollbar max-h-[min(calc(--spacing(72)---spacing(9)),calc(var(--available-height)---spacing(9)))] scroll-py-1 p-1 data-empty:p-0 overflow-y-auto overscroll-contain',
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
        "text-foreground data-highlighted:text-foreground data-highlighted:before:bg-accent gap-2.5 rounded-xl px-3 py-2 text-sm data-highlighted:before:rounded-lg [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden transition-colors select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:relative data-highlighted:z-0 data-highlighted:before:absolute data-highlighted:before:inset-0 data-highlighted:before:z-[-1] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([role=img]):not([class*=text-])]:opacity-60",
        className,
      )}
      data-slot="autocomplete-item"
      {...props}
    />
  );
}

export type AutocompleteContentProps = {
  align?: AutocompletePrimitive.Positioner.Props['align'];
  sideOffset?: AutocompletePrimitive.Positioner.Props['sideOffset'];
  alignOffset?: AutocompletePrimitive.Positioner.Props['alignOffset'];
  side?: AutocompletePrimitive.Positioner.Props['side'];
  anchor?: AutocompletePrimitive.Positioner.Props['anchor'];
  showBackdrop?: boolean;
} & React.ComponentProps<typeof AutocompletePrimitive.Popup>;

function AutocompleteContent({
  className,
  children,
  showBackdrop = false,
  align = 'start',
  sideOffset = 4,
  alignOffset = 0,
  side = 'bottom',
  anchor,
  ...props
}: AutocompleteContentProps) {
  return (
    <AutocompletePortal>
      {showBackdrop ? <AutocompleteBackdrop /> : null}
      <AutocompletePositioner
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        side={side}
        sideOffset={sideOffset}
      >
        <div className="relative flex max-h-full">
          <AutocompletePrimitive.Popup
            className={cn(
              'bg-popover text-popover-foreground rounded-2xl shadow-2xl ring-foreground/5 flex max-h-[min(var(--available-height),24rem)] w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) scroll-py-2 flex-col overscroll-contain py-0.5 ring-1 transition-[scale,opacity] has-data-starting-style:scale-98 has-data-starting-style:opacity-0 has-data-[side=none]:scale-100 has-data-[side=none]:transition-none',
              className,
            )}
            data-slot="autocomplete-popup"
            {...props}
          >
            {children}
          </AutocompletePrimitive.Popup>
        </div>
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
