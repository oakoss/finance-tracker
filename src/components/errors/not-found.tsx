import { Link } from '@tanstack/react-router';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  TypographyH1,
  TypographyMuted,
  TypographyP,
} from '@/components/ui/typography';

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <Icons.Search className="size-5" />
      </div>
      <div className="max-w-md space-y-3">
        <TypographyH1>Page not found</TypographyH1>
        <TypographyP>
          We couldn&#39;t find the page you&#39;re looking for. Check the URL or
          head back home.
        </TypographyP>
        <TypographyMuted>HTTP 404</TypographyMuted>
      </div>
      <Button render={<Link to="/" />}>Go home</Button>
    </div>
  );
}

export { NotFound };
