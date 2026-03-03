import { useNavigate } from '@tanstack/react-router';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useHydrated } from '@/hooks/use-hydrated';
import { m } from '@/paraglide/messages';

export function CategoriesPageHeader() {
  const hydrated = useHydrated();
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold tracking-tight">
        {m['categories.title']()}
      </h1>
      <Button
        disabled={!hydrated}
        size="sm"
        onClick={() =>
          void navigate({ search: { modal: 'create' }, to: '/categories' })
        }
      >
        <Icons.Plus className="size-4" />
        {m['categories.addCategory']()}
      </Button>
    </div>
  );
}
