import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'relative inline-flex w-fit shrink-0 items-center justify-center whitespace-nowrap rounded-4xl border border-transparent font-medium outline-none transition-all has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive overflow-hidden group/badge [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-3',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        destructive:
          'border-destructive/30 bg-destructive/4 text-destructive [a]:hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
        'destructive-light':
          'bg-destructive/10 border-none text-destructive-foreground dark:bg-destructive/20',
        'destructive-outline':
          'bg-background border-border text-destructive-foreground dark:bg-input/30',
        ghost:
          'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
        info: 'border-info/30 bg-info/4 text-info-foreground',
        'info-light':
          'bg-info/10 border-none text-info-foreground dark:bg-info/20',
        'info-outline':
          'bg-background border-border text-info-foreground dark:bg-input/30',
        invert: 'border-invert bg-invert text-invert-foreground',
        'invert-light':
          'bg-invert/10 border-none text-foreground dark:bg-invert/20',
        'invert-outline':
          'bg-background border-border text-invert-foreground dark:bg-input/30',
        link: 'text-primary underline-offset-4 hover:underline',
        outline:
          'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground bg-input/30',
        'primary-light':
          'bg-primary/10 border-none text-primary dark:bg-primary/20',
        'primary-outline':
          'bg-background border-border text-primary dark:bg-input/30',
        secondary:
          'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
        success: 'border-success/30 bg-success/4 text-success-foreground',
        'success-light':
          'bg-success/10 border-none text-success-foreground dark:bg-success/20',
        'success-outline':
          'bg-background border-border text-success-foreground dark:bg-input/30',
        warning: 'border-warning/30 bg-warning/4 text-warning-foreground',
        'warning-light':
          'bg-warning/10 border-none text-warning-foreground dark:bg-warning/20',
        'warning-outline':
          'bg-background border-border text-warning-foreground dark:bg-input/30',
      },
      size: {
        default: 'h-5 min-w-5 gap-1 px-1.25 py-0.5 text-xs',
        lg: 'h-5.5 min-w-5.5 gap-1 px-1.5 py-0.5 text-xs',
        sm: 'h-4.5 min-w-4.5 gap-1 px-1 py-px text-[0.625rem] leading-none',
        xl: 'h-6 min-w-6 gap-1.5 px-2 py-0.75 text-sm',
        xs: 'h-4 min-w-4 gap-1 px-1 py-px text-[0.6rem] leading-none',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type BadgeProps = {
  variant?: VariantProps<typeof badgeVariants>['variant'];
  size?: VariantProps<typeof badgeVariants>['size'];
} & useRender.ComponentProps<'span'>;

function Badge({
  className,
  variant = 'default',
  size = 'default',
  render,
  ...props
}: BadgeProps) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ className, size, variant })),
      },
      props,
    ),
    render,
    state: {
      slot: 'badge',
      variant,
    },
  });
}

export { Badge, type BadgeProps, badgeVariants };
