import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
import * as React from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { m } from '@/paraglide/messages';

type ConfirmDestructiveDialogProps = {
  actionLabel?: string;
  confirmPhrase: string;
  description: string;
  loading?: boolean | undefined;
  onConfirm: () => void;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  title: string;
  trigger?: React.ReactElement;
};

function ConfirmDestructiveDialog({
  actionLabel,
  confirmPhrase,
  description,
  loading,
  onConfirm,
  onOpenChange: onOpenChangeProp,
  open: openProp,
  title,
  trigger,
}: ConfirmDestructiveDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const [value, setValue] = React.useState('');
  const { copied, copy } = useCopyToClipboard({ timeout: 1500 });
  const inputId = React.useId();

  const isMatch = confirmPhrase.length > 0 && value === confirmPhrase;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && loading) return;
    if (!isControlled) setInternalOpen(nextOpen);
    onOpenChangeProp?.(nextOpen);
    if (!nextOpen) {
      setValue('');
    }
  };

  const handleConfirm = () => {
    if (!isMatch || loading) return;
    onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <AlertDialogPrimitive.Trigger render={trigger} />}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2" data-slot="confirm-field">
          <Label htmlFor={inputId}>
            {m['confirm.typePhrasePrefix']()}{' '}
            <TooltipProvider>
              <Tooltip open={copied}>
                <TooltipTrigger
                  render={
                    <code className="cursor-copy select-all rounded-sm bg-muted px-1.5 py-0.5 font-mono font-semibold" />
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    copy(confirmPhrase);
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {confirmPhrase}
                </TooltipTrigger>
                <TooltipContent>{m['confirm.copied']()}</TooltipContent>
              </Tooltip>
            </TooltipProvider>{' '}
            {m['confirm.typePhraseSuffix']()}
          </Label>
          <Input
            autoComplete="off"
            id={inputId}
            placeholder={confirmPhrase}
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {m['actions.cancel']()}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={!isMatch}
            loading={loading}
            variant="destructive"
            onClick={handleConfirm}
          >
            {actionLabel ?? m['actions.delete']()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { ConfirmDestructiveDialog };
export type { ConfirmDestructiveDialogProps };
