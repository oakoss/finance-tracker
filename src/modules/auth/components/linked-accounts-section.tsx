import { useSuspenseQuery } from '@tanstack/react-query';

import { Icons } from '@/components/icons';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { linkedAccountQueries } from '@/modules/auth/hooks/use-linked-accounts';
import { m } from '@/paraglide/messages';

const providerIcons: Record<string, React.ReactNode> = {
  credential: <Icons.Mail />,
  github: <Icons.GitHub />,
  google: <Icons.Google />,
};

function getProviderLabel(providerId: string): string {
  if (providerId === 'credential') return m['profile.provider.credential']();
  if (providerId === 'github') return m['profile.provider.github']();
  if (providerId === 'google') return m['profile.provider.google']();
  return providerId;
}

export function LinkedAccountsSection() {
  const { data: accounts } = useSuspenseQuery(linkedAccountQueries.list());

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m['profile.connectedAccounts.title']()}</CardTitle>
        <CardDescription>
          {m['profile.connectedAccounts.description']()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {accounts.map((account) => (
            <li
              key={account.providerId}
              className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
            >
              <span className="flex size-5 items-center justify-center text-muted-foreground">
                {providerIcons[account.providerId] ?? <Icons.User />}
              </span>
              <span className="text-sm">
                {getProviderLabel(account.providerId)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
