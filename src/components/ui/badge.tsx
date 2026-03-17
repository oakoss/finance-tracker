import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'group/badge inline-flex w-fit shrink-0 items-center justify-center overflow-hidden rounded-4xl border border-transparent font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    defaultVariants: { size: 'default', variant: 'default' },
    variants: {
      size: {
        default: 'h-5 min-w-5 gap-1 px-1.25 py-0.5 text-xs',
        lg: 'h-5.5 min-w-5.5 gap-1 px-1.5 py-0.5 text-xs',
        sm: 'h-4.5 min-w-4.5 gap-1 px-1 py-px text-[0.625rem] leading-none',
        xl: 'h-6 min-w-6 gap-1.5 px-2 py-0.75 text-sm',
        xs: 'h-4 min-w-4 gap-1 px-1 py-px text-[0.6rem] leading-none',
      },
      variant: {
        default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        destructive:
          'bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20',
        'destructive-light':
          'border-none bg-destructive/10 text-destructive-foreground dark:bg-destructive/20',
        'destructive-outline':
          'border-border bg-background text-destructive-foreground dark:bg-input/30',
        ghost:
          'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
        info: 'border-info/30 bg-info/4 text-info-foreground',
        'info-light':
          'border-none bg-info/10 text-info-foreground dark:bg-info/20',
        'info-outline':
          'border-border bg-background text-info-foreground dark:bg-input/30',
        invert: 'border-invert bg-invert text-invert-foreground',
        'invert-light':
          'border-none bg-invert/10 text-foreground dark:bg-invert/20',
        'invert-outline':
          'border-border bg-background text-invert-foreground dark:bg-input/30',
        link: 'text-primary underline-offset-4 hover:underline',
        outline:
          'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground',
        'primary-light':
          'border-none bg-primary/10 text-primary dark:bg-primary/20',
        'primary-outline':
          'border-border bg-background text-primary dark:bg-input/30',
        secondary:
          'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
        success: 'border-success/30 bg-success/4 text-success-foreground',
        'success-light':
          'border-none bg-success/10 text-success-foreground dark:bg-success/20',
        'success-outline':
          'border-border bg-background text-success-foreground dark:bg-input/30',
        warning: 'border-warning/30 bg-warning/4 text-warning-foreground',
        'warning-light':
          'border-none bg-warning/10 text-warning-foreground dark:bg-warning/20',
        'warning-outline':
          'border-border bg-background text-warning-foreground dark:bg-input/30',
      },
    },
  },
);

type BadgeProps = {
  size?: VariantProps<typeof badgeVariants>['size'];
  variant?: VariantProps<typeof badgeVariants>['variant'];
} & useRender.ComponentProps<'span'>;

function Badge({
  className,
  render,
  size = 'default',
  variant = 'default',
  ...props
}: BadgeProps) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      { className: cn(badgeVariants({ size, variant }), className) },
      props,
    ),
    render,
    state: { slot: 'badge', variant },
  });
}

export { Badge, type BadgeProps, badgeVariants };
