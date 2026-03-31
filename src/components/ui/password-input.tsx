import { useState } from 'react';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages';

function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, 'type'>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        className={cn('pr-9', className)}
        type={visible ? 'text' : 'password'}
        {...props}
      />
      <Button
        aria-label={
          visible
            ? m['auth.password.hidePassword']()
            : m['auth.password.showPassword']()
        }
        className="absolute inset-y-0 right-0 my-auto"
        size="icon-sm"
        type="button"
        variant="ghost"
        onClick={() => setVisible((prev) => !prev)}
      >
        {visible ? (
          <Icons.EyeOff aria-hidden="true" />
        ) : (
          <Icons.Eye aria-hidden="true" />
        )}
      </Button>
    </div>
  );
}

export { PasswordInput };
