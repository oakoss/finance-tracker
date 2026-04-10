import { useRouteContext } from '@tanstack/react-router';

import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatMonthYear } from '@/lib/i18n/date';
import { getInitials } from '@/modules/auth/lib/get-initials';
import { m } from '@/paraglide/messages';

export function ProfileInfoSection() {
  const { session } = useRouteContext({ from: '/_app' });
  const { user } = session;

  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <Avatar className="size-16">
          <AvatarImage alt={user.name} src={user.image ?? undefined} />
          <AvatarFallback className="text-lg">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold">{user.name}</p>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {user.emailVerified && (
              <Badge variant="success">
                <Icons.Check className="size-3" />
                {m['profile.info.verified']()}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {m['profile.info.memberSince']({
              date: formatMonthYear({ value: new Date(user.createdAt) }),
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
