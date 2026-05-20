import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages';

type SpinnerProps = { decorative?: boolean } & React.ComponentProps<'svg'>;

function Spinner({ className, decorative, ...props }: SpinnerProps) {
  if (decorative) {
    return (
      <Icons.Loader2
        aria-hidden={true}
        className={cn('size-4 animate-spin', className)}
        {...props}
      />
    );
  }

  return (
    <Icons.Loader2
      aria-label={m['common.loading']()}
      className={cn('size-4 animate-spin', className)}
      role="status"
      {...props}
    />
  );
}

export { Spinner };
