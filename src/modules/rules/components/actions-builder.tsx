import { useState } from 'react';

import type { RuleAction } from '@/modules/rules/models';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ActionCard,
  type ActionCardLookup,
} from '@/modules/rules/components/action-card';
import { m } from '@/paraglide/messages';

type ActionsBuilderProps = {
  actions: RuleAction[];
  disabled: boolean | undefined;
  lookup: ActionCardLookup;
  onChange: (actions: RuleAction[]) => void;
};

type AddableKind = 'setCategory' | 'setNote' | 'setPayee' | 'setTags';

// UI hides setExcludedFromBudget (apply throws 501). Duplicate setCategory
// or setPayee cards would be confusing (last-wins), so the Add popover
// disables those entries once present. setTags can stack (append + replace).
const ADDABLE: AddableKind[] = [
  'setCategory',
  'setPayee',
  'setTags',
  'setNote',
];

const LABEL: Record<AddableKind, () => string> = {
  setCategory: () => m['rules.form.actions.addCategory'](),
  setNote: () => m['rules.form.actions.addNote'](),
  setPayee: () => m['rules.form.actions.addPayee'](),
  setTags: () => m['rules.form.actions.addTags'](),
};

function blankAction(kind: AddableKind): RuleAction {
  switch (kind) {
    case 'setCategory': {
      return { categoryId: '', kind: 'setCategory' };
    }
    case 'setNote': {
      return { kind: 'setNote', value: '' };
    }
    case 'setPayee': {
      return { kind: 'setPayee', payeeId: '' };
    }
    case 'setTags': {
      return { kind: 'setTags', mode: 'append', tagIds: [] };
    }
  }
}

export function ActionsBuilder({
  actions,
  disabled,
  lookup,
  onChange,
}: ActionsBuilderProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  // Content-hash keys would remount each card on every keystroke and drop
  // input focus; stable per-row IDs survive in-place edits.
  const [ids, setIds] = useState<string[]>(() =>
    actions.map(() => crypto.randomUUID()),
  );
  if (ids.length !== actions.length) {
    setIds(actions.map((_, i) => ids[i] ?? crypto.randomUUID()));
  }
  const has = (kind: AddableKind) => actions.some((a) => a.kind === kind);

  const addAction = (kind: AddableKind) => {
    setIds([...ids, crypto.randomUUID()]);
    onChange([...actions, blankAction(kind)]);
    setPopoverOpen(false);
  };

  const updateAt = (index: number, next: RuleAction) => {
    onChange(actions.map((a, i) => (i === index ? next : a)));
  };

  const removeAt = (index: number) => {
    setIds(ids.filter((_, i) => i !== index));
    onChange(actions.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-3">
      {actions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {m['rules.form.actions.empty']()}
        </p>
      ) : (
        actions.map((action, position) => (
          <ActionCard
            key={ids[position]}
            action={action}
            disabled={disabled}
            lookup={lookup}
            onChange={(next) => updateAt(position, next)}
            onRemove={() => removeAt(position)}
          />
        ))
      )}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger
          render={
            <Button disabled={disabled} variant="outline">
              <Icons.Plus />
              {m['rules.form.addAction']()}
            </Button>
          }
        />
        <PopoverContent className="flex w-48 flex-col gap-1 p-1">
          {ADDABLE.map((kind) => {
            const duplicateBlocked = kind !== 'setTags' && has(kind);
            return (
              <Button
                key={kind}
                className="justify-start"
                disabled={duplicateBlocked}
                size="sm"
                title={
                  duplicateBlocked
                    ? m['rules.form.actions.duplicateDisabled']()
                    : undefined
                }
                variant="ghost"
                onClick={() => addAction(kind)}
              >
                {LABEL[kind]()}
              </Button>
            );
          })}
        </PopoverContent>
      </Popover>
    </div>
  );
}
