import type { ComponentProps } from 'react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn, omit } from '@/lib/utils';
import { useIsEmailVerified } from '@/modules/auth/hooks/use-is-email-verified';
import { m } from '@/paraglide/messages';

type MutationGateProps = ComponentProps<typeof Button>;

/**
 * Client-side UX gate for mutation CTAs. Drop-in replacement for
 * `<Button>` with one behavior difference: when the user's email
 * is **not** verified, the caller's `onClick` is not invoked —
 * clicks are intercepted so the user sees the tooltip instead of
 * firing the mutation. The server middleware
 * (`verifiedMutationMiddleware`) is the actual security boundary;
 * this component is UX polish.
 *
 * Uses `aria-disabled` rather than native `disabled` in the gated
 * branch so the button stays keyboard-focusable and fires pointer
 * events, which lets the tooltip appear on hover and focus. Base
 * UI's `TooltipTrigger` wires `aria-describedby` automatically so
 * screen readers announce the gate reason when the button is
 * focused.
 *
 * If the caller passes `disabled={true}` (e.g., a pre-hydration
 * guard), the plain Button renders as-is and the gate wrapper is
 * skipped. Removing this early return re-introduces a regression
 * where `disabled={!hydrated}` is silently ignored and the button
 * becomes clickable before hydration.
 */
export function MutationGate(props: MutationGateProps) {
  const verified = useIsEmailVerified();
  if (verified || props.disabled) return <Button {...props} />;

  // Strip the caller's onClick so the interceptor is the only click handler.
  const rest = omit(props, 'onClick');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              {...rest}
              aria-disabled
              className={cn(
                'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
                rest.className,
              )}
              onClick={(event) => event.preventDefault()}
            />
          }
        />
        <TooltipContent>{m['auth.verification.gateTooltip']()}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
