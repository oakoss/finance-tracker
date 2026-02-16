import { type ErrorComponentProps, Link } from '@tanstack/react-router';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  TypographyH1,
  TypographyMuted,
  TypographyP,
} from '@/components/ui/typography';

function RootErrorBoundary({ error, reset }: ErrorComponentProps) {
  const message =
    error instanceof Error ? error.message : 'Something went wrong.';

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
        <Icons.TriangleAlert className="size-5" />
      </div>
      <div className="max-w-md space-y-3">
        <TypographyH1>Something went wrong</TypographyH1>
        <TypographyP>{message}</TypographyP>
        <TypographyMuted>Try again or return home.</TypographyMuted>
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
        <Button render={<Link to="/" />}>Go home</Button>
      </div>
    </div>
  );
}

export { RootErrorBoundary };
