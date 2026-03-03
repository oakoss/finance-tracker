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
            <span className="font-mono font-semibold">{confirmPhrase}</span>{' '}
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
