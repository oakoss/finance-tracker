import { createFileRoute } from '@tanstack/react-router';

import { Logo } from '@/components/logo';
import { appConfig } from '@/configs/app';
import { m } from '@/paraglide/messages';

export const Route = createFileRoute('/_public/')({ component: LandingPage });

function LandingPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-20 text-center">
      <Logo className="size-12 text-primary" />
      <h1 className="text-4xl font-bold tracking-tight">{appConfig.name}</h1>
      <p className="max-w-md text-lg text-muted-foreground">
        {m['landing.description']()}
      </p>
    </div>
  );
}
