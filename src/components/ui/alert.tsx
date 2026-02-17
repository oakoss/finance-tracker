import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const alertVariants = cva(
  [
    'relative w-full text-sm border grid gap-y-0.5 items-center',
    'grid-cols-[0_1fr] has-[>svg]:grid-cols-[calc(var(--spacing)*3)_1fr]',
    'has-[>svg]:gap-x-2.5 [&>svg:not([class*=size-])]:size-4',
    'has-[>[data-slot=alert-title]+[data-slot=alert-description]]:items-start',
    'has-[>[data-slot=alert-title]+[data-slot=alert-description]]:[&_svg]:translate-y-0.5',
    'has-[>[data-slot=alert-title]+[data-slot=alert-description]]:**:data-[slot=alert-action]:sm:row-end-3',
    'rounded-4xl p-3',
  ],
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive:
          'border-destructive/30 bg-destructive/4 text-destructive *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current',
        info: 'border-info/30 bg-info/4 [&>svg]:text-info',
        invert:
          'border-invert bg-invert text-invert-foreground **:data-[slot=alert-description]:text-invert-foreground/70',
        success: 'border-success/30 bg-success/4 [&>svg]:text-success',
        warning: 'border-warning/30 bg-warning/4 [&>svg]:text-warning',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      className={cn(alertVariants({ variant }), className)}
      data-slot="alert"
      role="alert"
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight [&_a]:hover:text-foreground [&_a]:underline [&_a]:underline-offset-3',
        className,
      )}
      data-slot="alert-title"
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'text-muted-foreground col-start-2 grid justify-items-start gap-1 text-balance text-sm md:text-pretty [&_p:not(:last-child)]:mb-4 [&_p]:leading-relaxed [&_a]:hover:text-foreground [&_a]:underline [&_a]:underline-offset-3',
        className,
      )}
      data-slot="alert-description"
      {...props}
    />
  );
}

function AlertAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex gap-1.5 max-sm:col-start-2 max-sm:mt-2 max-sm:justify-start sm:col-start-3 sm:row-start-1 sm:justify-end sm:self-center',
        className,
      )}
      data-slot="alert-action"
      {...props}
    />
  );
}

export { Alert, AlertAction, AlertDescription, AlertTitle };
