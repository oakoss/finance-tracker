import { useNavigate, useSearch } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AccountForm,
  type AccountFormValues,
  parseFormTerms,
} from '@/modules/accounts/components/account-form';
import { useCreateAccount } from '@/modules/accounts/hooks/use-accounts';
import { m } from '@/paraglide/messages';

export function CreateAccountDialog() {
  const search = useSearch({ from: '/_app/accounts' });
  const navigate = useNavigate();
  const mutation = useCreateAccount();

  const open = search.modal === 'create';

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      void navigate({ search: {}, to: '/accounts' });
    }
  };

  const handleSubmit = (values: AccountFormValues) => {
    const initialBalanceCents = values.initialBalanceCents
      ? Math.round(Number.parseFloat(values.initialBalanceCents) * 100)
      : undefined;

    const terms = parseFormTerms(values);
    mutation.mutate({
      ...(values.accountNumberMask
        ? { accountNumberMask: values.accountNumberMask }
        : {}),
      currency: values.currency,
      ...(initialBalanceCents === undefined ? {} : { initialBalanceCents }),
      ...(values.institution ? { institution: values.institution } : {}),
      name: values.name,
      openedAt: values.openedAt || null,
      ownerType: values.ownerType,
      ...(terms ? { terms } : {}),
      type: values.type,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{m['accounts.create.title']()}</DialogTitle>
          <DialogDescription>
            {m['accounts.create.description']()}
          </DialogDescription>
        </DialogHeader>
        <AccountForm
          isSubmitting={mutation.isPending}
          onSubmit={handleSubmit}
        />
        <DialogFooter>
          <Button
            disabled={mutation.isPending}
            variant="outline"
            onClick={() => void navigate({ search: {}, to: '/accounts' })}
          >
            {m['actions.cancel']()}
          </Button>
          <Button
            form="account-form"
            loading={mutation.isPending}
            type="submit"
          >
            {m['actions.create']()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
