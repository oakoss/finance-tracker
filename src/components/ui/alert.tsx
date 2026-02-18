import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const alertVariants = cva(
  [
    'relative w-full grid gap-y-0.5 rounded-lg border px-2.5 py-2 text-start text-sm group/alert',
    'has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 has-[>svg]:has-data-[slot=alert-action]:sm:grid-cols-[auto_1fr_auto]',
    '[&>svg]:row-span-2 [&>svg]:text-current [&>svg:not([class*=size-])]:size-4',
    'has-[>[data-slot=alert-title]+[data-slot=alert-description]]:[&>svg]:translate-y-0.5',
    'has-[>[data-slot=alert-title]+[data-slot=alert-description]]:**:data-[slot=alert-action]:sm:row-end-3',
  ],
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive:
          'border-destructive/30 bg-destructive/4 [&>svg]:text-destructive',
        info: 'border-info/30 bg-info/4 [&>svg]:text-info',
        invert:
          'border-invert bg-invert text-invert-foreground *:data-[slot=alert-description]:text-invert-foreground/70',
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
        'line-clamp-1 min-h-4 font-medium tracking-tight group-has-[>svg]/alert:col-start-2 [&_a]:hover:text-foreground [&_a]:underline [&_a]:underline-offset-3',
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
        'grid justify-items-start gap-1 text-muted-foreground text-sm text-balance md:text-pretty group-has-[>svg]/alert:col-start-2 [&_p:not(:last-child)]:mb-4 [&_p]:leading-relaxed [&_a]:hover:text-foreground [&_a]:underline [&_a]:underline-offset-3',
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
        'flex gap-1.5 group-has-[>svg]/alert:max-sm:col-start-2 max-sm:mt-2 max-sm:justify-start sm:col-start-3 sm:row-start-1 sm:justify-end sm:self-center',
        className,
      )}
      data-slot="alert-action"
      {...props}
    />
  );
}

export { Alert, AlertAction, AlertDescription, AlertTitle };
