import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const emptyVariants = cva(
  'rounded-xl border border-dashed flex w-full min-w-0 flex-1 flex-col items-center justify-center text-center text-balance',
  {
    defaultVariants: {
      size: 'default',
    },
    variants: {
      size: {
        default: 'gap-4 p-4 sm:p-6 lg:p-12',
        sm: 'gap-3 p-4 sm:p-6',
      },
    },
  },
);

function Empty({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof emptyVariants>) {
  return (
    <div
      className={cn(emptyVariants({ size }), className)}
      data-size={size}
      data-slot="empty"
      {...props}
    />
  );
}

function EmptyHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('gap-2 flex max-w-sm flex-col items-center', className)}
      data-slot="empty-header"
      {...props}
    />
  );
}

const emptyMediaVariants = cva(
  'mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      variant: {
        default: 'bg-transparent',
        icon: "bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-4",
        prominent:
          "bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-xl [&_svg:not([class*='size-'])]:size-6",
      },
    },
  },
);

function EmptyMedia({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      className={cn(emptyMediaVariants({ variant }), className)}
      data-slot="empty-media"
      data-variant={variant}
      {...props}
    />
  );
}

function EmptyTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('text-sm font-medium tracking-tight', className)}
      data-slot="empty-title"
      {...props}
    />
  );
}

function EmptyDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'text-sm/relaxed text-muted-foreground [&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4',
        className,
      )}
      data-slot="empty-description"
      {...props}
    />
  );
}

function EmptyContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'gap-2.5 text-sm flex w-full max-w-sm min-w-0 flex-col items-center text-balance',
        className,
      )}
      data-slot="empty-content"
      {...props}
    />
  );
}

export {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
};
