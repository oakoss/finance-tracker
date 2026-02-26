import { Icons } from '@/components/icons';
import { RouterButton } from '@/components/ui/button';

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <Icons.Search className="size-5" />
      </div>
      <div className="max-w-md space-y-3">
        <h1 className="text-4xl font-extrabold tracking-tight text-balance">
          Page not found
        </h1>
        <p className="leading-7">
          We couldn&#39;t find the page you&#39;re looking for. Check the URL or
          head back home.
        </p>
        <p className="text-sm text-muted-foreground">HTTP 404</p>
      </div>
      <RouterButton to="/">Go home</RouterButton>
    </div>
  );
}

export { NotFound };
