import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages';

type BannerVariant = 'destructive' | 'info' | 'success' | 'warning';

const DEFAULT_VARIANT = 'info' satisfies BannerVariant;

// Variants that map to role="alert" (assertive ARIA live region).
// All other variants map to role="status" (polite live region).
const ASSERTIVE_VARIANTS = new Set<BannerVariant>(['destructive', 'warning']);

const bannerVariants = cva(
  [
    'relative grid w-full gap-x-3 border-b px-4 py-2.5 text-start text-sm group/banner lg:px-6',
    'has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:has-data-[slot=banner-action]:grid-cols-[auto_1fr_auto] has-[>svg]:has-data-[slot=banner-dismiss]:grid-cols-[auto_1fr_auto] has-[>svg]:has-data-[slot=banner-action]:has-data-[slot=banner-dismiss]:grid-cols-[auto_1fr_auto_auto]',
    'not-has-[>svg]:has-data-[slot=banner-action]:grid-cols-[1fr_auto] not-has-[>svg]:has-data-[slot=banner-dismiss]:grid-cols-[1fr_auto] not-has-[>svg]:has-data-[slot=banner-action]:has-data-[slot=banner-dismiss]:grid-cols-[1fr_auto_auto]',
    '[&>svg]:row-span-2 [&>svg]:self-start [&>svg]:text-current [&>svg:not([class*=size-])]:size-4 [&>svg]:translate-y-0.5',
  ],
  {
    defaultVariants: {
      variant: DEFAULT_VARIANT,
    },
    variants: {
      variant: {
        destructive:
          'border-destructive/30 bg-destructive/4 [&>svg]:text-destructive',
        info: 'border-info/30 bg-info/4 [&>svg]:text-info',
        success: 'border-success/30 bg-success/4 [&>svg]:text-success',
        warning: 'border-warning/30 bg-warning/4 [&>svg]:text-warning',
      },
    },
  },
);

function Banner({
  className,
  role,
  variant = DEFAULT_VARIANT,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof bannerVariants>) {
  const resolvedVariant = variant ?? DEFAULT_VARIANT;
  const resolvedRole =
    role ?? (ASSERTIVE_VARIANTS.has(resolvedVariant) ? 'alert' : 'status');

  return (
    <div
      className={cn(bannerVariants({ variant: resolvedVariant }), className)}
      data-slot="banner"
      role={resolvedRole}
      {...props}
    />
  );
}

function BannerTitle({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'font-medium tracking-tight group-has-[>svg]/banner:col-start-2',
        className,
      )}
      data-slot="banner-title"
      {...props}
    />
  );
}

function BannerDescription({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'text-sm text-muted-foreground group-has-[>svg]/banner:col-start-2',
        className,
      )}
      data-slot="banner-description"
      {...props}
    />
  );
}

function BannerAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex items-center gap-1.5 self-center', className)}
      data-slot="banner-action"
      {...props}
    />
  );
}

function BannerDismiss({
  className,
  ...props
}: Omit<React.ComponentProps<'button'>, 'children'>) {
  return (
    <button
      aria-label={m['actions.close']()}
      className={cn(
        'inline-flex items-center justify-center self-center rounded-sm p-1.5 opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className,
      )}
      data-slot="banner-dismiss"
      type="button"
      {...props}
    >
      <X className="size-4" />
    </button>
  );
}

export {
  Banner,
  BannerAction,
  BannerDescription,
  BannerDismiss,
  BannerTitle,
  type BannerVariant,
};
