import type { ErrorComponentProps } from '@tanstack/react-router';

import { Icons } from '@/components/icons';
import { Button, RouterButton } from '@/components/ui/button';

function RootErrorBoundary({ error, reset }: ErrorComponentProps) {
  const message =
    error instanceof Error ? error.message : 'Something went wrong.';

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <Icons.TriangleAlert className="size-5" />
      </div>
      <div className="max-w-md space-y-3">
        <h1 className="text-4xl font-extrabold tracking-tight text-balance">
          Something went wrong
        </h1>
        <p className="leading-7">{message}</p>
        <p className="text-sm text-muted-foreground">
          Try again or return home.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            reset?.();
          }}
        >
          Try again
        </Button>
        <RouterButton to="/">Go home</RouterButton>
      </div>
    </div>
  );
}

export { RootErrorBoundary };
