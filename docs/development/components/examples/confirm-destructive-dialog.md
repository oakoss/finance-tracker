# Confirm Destructive Dialog

Pre-composed type-to-confirm dialog for destructive actions. Built on
`AlertDialog` with an input that must exactly match a confirmation phrase
before the action button enables.

Source: `src/components/ui/confirm-destructive-dialog.tsx`

## Props

| Prop            | Type                 | Default               | Description                               |
| --------------- | -------------------- | --------------------- | ----------------------------------------- |
| `confirmPhrase` | `string`             | required              | Phrase the user must type to confirm      |
| `description`   | `string`             | required              | Explanation shown below the title         |
| `title`         | `string`             | required              | Dialog heading                            |
| `trigger`       | `React.ReactElement` | required              | Interactive element that opens the dialog |
| `onConfirm`     | `() => void`         | required              | Called when the user confirms             |
| `actionLabel`   | `string`             | i18n `actions.delete` | Custom label for the action button        |
| `loading`       | `boolean`            | `false`               | Shows spinner and disables the button     |

## Basic usage

```tsx
import { Button } from '@/components/ui/button';
import { ConfirmDestructiveDialog } from '@/components/ui/confirm-destructive-dialog';

function DeleteAccountButton() {
  const handleDelete = () => {
    // call server function
  };

  return (
    <ConfirmDestructiveDialog
      confirmPhrase="delete my account"
      description="This will permanently delete your account and all data."
      title="Delete account?"
      trigger={<Button variant="destructive">Delete Account</Button>}
      onConfirm={handleDelete}
    />
  );
}
```

## With loading state

```tsx
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ConfirmDestructiveDialog } from '@/components/ui/confirm-destructive-dialog';

function DeleteCategoryButton({ categoryId }: { categoryId: string }) {
  const [isPending, setIsPending] = useState(false);

  const handleDelete = async () => {
    setIsPending(true);
    await deleteCategory({ id: categoryId });
    setIsPending(false);
  };

  return (
    <ConfirmDestructiveDialog
      confirmPhrase="DELETE"
      description="All transactions in this category will become uncategorized."
      loading={isPending}
      title="Delete category?"
      trigger={<Button variant="destructive">Delete</Button>}
      onConfirm={handleDelete}
    />
  );
}
```

## Custom action label

```tsx
<ConfirmDestructiveDialog
  actionLabel="Remove forever"
  confirmPhrase="remove"
  description="This cannot be undone."
  title="Remove all data?"
  trigger={<Button variant="destructive">Remove</Button>}
  onConfirm={handleRemove}
/>
```

## Behavior

- Input resets when the dialog closes and reopens.
- Match is case-sensitive (`DELETE` !== `delete`).
- Empty `confirmPhrase` keeps the action button permanently disabled.
- Action button stays disabled until exact match.
- Action button stays disabled while `loading` is `true`, even if the
  phrase matches.
- Dialog cannot be closed while `loading` (Escape and Cancel are blocked).
- The component does not `await` `onConfirm`. For async operations,
  manage the `loading` prop externally to keep the dialog open.
- The label displays the confirm phrase in a `<code>` tag with a muted
  background and `select-all`, making it visually distinct and
  one-click selectable for copy-paste.
- The input placeholder echoes the confirm phrase as a hint.

## i18n keys

- `confirm.typePhraseLabel` -- "Type the following to confirm:"
- `actions.cancel` -- Cancel button
- `actions.delete` -- Default action button (overridden by `actionLabel`)
