import { Link } from '@tanstack/react-router';
import { cva, type VariantProps } from 'class-variance-authority';

import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

const linkVariants = cva(
  'inline-flex items-center gap-1 transition-colors outline-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      inline: {
        false: '',
        true: 'underline underline-offset-4',
      },
      size: {
        default: 'text-sm',
        inherit: '',
        lg: 'text-lg font-semibold',
        sm: 'text-xs',
      },
      variant: {
        brand: 'text-foreground',
        default:
          'text-link-foreground underline-offset-4 hover:underline focus-visible:underline data-[status=active]:underline',
        destructive:
          'text-destructive underline-offset-4 hover:underline focus-visible:underline',
        muted:
          'text-muted-foreground underline-offset-4 hover:text-foreground focus-visible:text-foreground data-[status=active]:text-foreground',
        nav: 'font-medium text-muted-foreground hover:text-foreground focus-visible:text-foreground data-[status=active]:font-semibold data-[status=active]:text-foreground',
        subtle:
          'text-foreground hover:text-foreground/80 focus-visible:text-foreground/80 data-[status=active]:text-foreground',
      },
    },
  },
);

type RouterLinkProps = React.ComponentProps<typeof Link> &
  VariantProps<typeof linkVariants> & {
    external?: boolean;
    showExternalIcon?: boolean;
  };

function RouterLink({
  children,
  className,
  external,
  inline,
  showExternalIcon,
  size = 'default',
  variant = 'default',
  ...props
}: RouterLinkProps) {
  const externalIcon = showExternalIcon ? (
    <Icons.ExternalLink aria-hidden="true" className="size-[1em]" />
  ) : null;

  return (
    <Link
      className={cn(linkVariants({ className, inline, size, variant }))}
      data-slot="link"
      {...(external && {
        rel: 'noopener noreferrer',
        target: '_blank',
      })}
      {...props}
    >
      {typeof children === 'function' ? (
        (state) => (
          <>
            {children(state)}
            {externalIcon}
          </>
        )
      ) : (
        <>
          {children}
          {externalIcon}
        </>
      )}
    </Link>
  );
}

export { linkVariants, RouterLink };
