import { useNavigate, useSearch } from '@tanstack/react-router';
import { useMemo } from 'react';

import type { AccountListItem } from '@/modules/accounts/api/list-accounts';

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
import { useUpdateAccount } from '@/modules/accounts/hooks/use-accounts';
import { m } from '@/paraglide/messages';

type EditAccountDialogProps = {
  accounts: AccountListItem[];
};

export function EditAccountDialog({ accounts }: EditAccountDialogProps) {
  const search = useSearch({ from: '/_app/accounts' });
  const navigate = useNavigate();
  const mutation = useUpdateAccount();

  const editId = search.edit;
  const open = !!editId;

  const item = useMemo(
    () => accounts.find((a) => a.account.id === editId),
    [accounts, editId],
  );

  const defaultValues = useMemo<Partial<AccountFormValues> | undefined>(() => {
    if (!item) return;
    const { account, terms } = item;
    return {
      accountNumberMask: account.accountNumberMask ?? '',
      currency: account.currency,
      institution: account.institution ?? '',
      name: account.name,
      openedAt: account.openedAt
        ? new Date(account.openedAt).toISOString().split('T')[0]
        : '',
      ownerType: account.ownerType,
      terms: {
        aprBps: terms?.aprBps?.toString() ?? '',
        dueDay: terms?.dueDay?.toString() ?? '',
        minPaymentType: terms?.minPaymentType ?? 'percentage',
        minPaymentValue: terms?.minPaymentValue?.toString() ?? '',
        statementDay: terms?.statementDay?.toString() ?? '',
      },
      type: account.type,
    };
  }, [item]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      void navigate({ search: {}, to: '/accounts' });
    }
  };

  const handleSubmit = (values: AccountFormValues) => {
    if (!editId) return;
    const terms = parseFormTerms(values);
    mutation.mutate({
      accountNumberMask: values.accountNumberMask || null,
      currency: values.currency,
      id: editId,
      institution: values.institution || null,
      name: values.name,
      openedAt: values.openedAt || null,
      ownerType: values.ownerType,
      ...(terms ? { terms } : {}),
      type: values.type,
    });
  };

  if (!open || !defaultValues) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{m['accounts.edit.title']()}</DialogTitle>
          <DialogDescription>
            {m['accounts.edit.description']()}
          </DialogDescription>
        </DialogHeader>
        <AccountForm
          defaultValues={defaultValues}
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
            {m['actions.save']()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
