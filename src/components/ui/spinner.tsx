import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages';

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
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
