import { useSuspenseQuery } from '@tanstack/react-query';
import { Suspense, useId, useState } from 'react';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  payeeAliasQueries,
  useCreatePayeeAlias,
  useDeletePayeeAlias,
} from '@/modules/payees/hooks/use-payee-aliases';
import { payeeQueries } from '@/modules/payees/hooks/use-payees';
import { m } from '@/paraglide/messages';

export function PayeeAliasesTab() {
  const { data: payees } = useSuspenseQuery(payeeQueries.list());
  const [payeeId, setPayeeId] = useState<string | null>(null);
  const payeeFieldId = useId();

  if (payees.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="prominent">
            <Icons.Tag />
          </EmptyMedia>
          <EmptyTitle>{m['rules.aliases.noPayees.title']()}</EmptyTitle>
          <EmptyDescription>
            {m['rules.aliases.noPayees.description']()}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Field>
        <FieldLabel htmlFor={payeeFieldId}>
          {m['rules.aliases.payeeLabel']()}
        </FieldLabel>
        <Select value={payeeId} onValueChange={setPayeeId}>
          <SelectTrigger id={payeeFieldId}>
            <SelectValue placeholder={m['rules.aliases.payeePlaceholder']()} />
          </SelectTrigger>
          <SelectContent>
            {payees.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {payeeId ? (
        <Suspense key={payeeId} fallback={<Skeleton className="h-32 w-full" />}>
          <AliasManager payeeId={payeeId} />
        </Suspense>
      ) : (
        <p className="text-sm text-muted-foreground">
          {m['rules.aliases.selectPrompt']()}
        </p>
      )}
    </div>
  );
}

function AliasManager({ payeeId }: { payeeId: string }) {
  const { data: aliases } = useSuspenseQuery(payeeAliasQueries.list(payeeId));
  const create = useCreatePayeeAlias();
  const remove = useDeletePayeeAlias();
  const [draft, setDraft] = useState('');

  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    create.mutate(
      { alias: trimmed, payeeId },
      { onSuccess: () => setDraft('') },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <form className="flex gap-2" onSubmit={handleSubmit}>
        <Input
          aria-label={m['rules.aliases.addAction']()}
          disabled={create.isPending}
          placeholder={m['rules.aliases.addPlaceholder']()}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button
          disabled={draft.trim().length === 0}
          loading={create.isPending}
          type="submit"
        >
          {m['rules.aliases.addAction']()}
        </Button>
      </form>
      {aliases.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{m['rules.aliases.empty.title']()}</EmptyTitle>
            <EmptyDescription>
              {m['rules.aliases.empty.description']()}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {aliases.map((alias) => (
            <li
              key={alias.id}
              aria-label={alias.alias}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              <span className="font-mono text-sm">{alias.alias}</span>
              <Button
                aria-label={m['rules.aliases.deleteAction']()}
                disabled={remove.isPending}
                size="icon-sm"
                variant="ghost"
                onClick={() => remove.mutate({ id: alias.id })}
              >
                <Icons.Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
