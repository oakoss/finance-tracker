import { useForm } from '@tanstack/react-form';
import { useRouteContext, useRouter } from '@tanstack/react-router';
import { type } from 'arktype';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth/client';
import { clientLog } from '@/lib/logging/client-logger';
import { parseError } from '@/lib/logging/evlog';
import { m } from '@/paraglide/messages';

const nameSchema = type({ name: '1 <= string <= 100' });

export function ProfileNameForm() {
  const { session } = useRouteContext({ from: '/_app' });
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const form = useForm({
    defaultValues: { name: session.user.name },
    onSubmit: async ({ value }) => {
      setIsPending(true);
      try {
        const result = await authClient.updateUser({ name: value.name });
        if (result.error) {
          clientLog.error({
            action: 'profile.name.update.failed',
            error: result.error.message,
          });
          toast.error(m['profile.toast.nameError'](), {
            description: result.error.message,
          });
          return;
        }
        toast.success(m['profile.toast.nameSuccess']());
        void router.invalidate();
      } catch (error) {
        const parsed = parseError(error);
        clientLog.error({
          action: 'profile.name.update.failed',
          error: parsed.message,
        });
        toast.error(m['profile.toast.nameError'](), {
          description: parsed.fix ?? parsed.why,
        });
      } finally {
        setIsPending(false);
      }
    },
    validators: { onSubmit: nameSchema },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m['profile.displayName.title']()}</CardTitle>
        <CardDescription>
          {m['profile.displayName.description']()}
        </CardDescription>
      </CardHeader>
      <form
        noValidate
        className="contents"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <CardContent>
          <form.Field name="name">
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0}>
                <FieldLabel htmlFor="profile-name">
                  {m['profile.displayName.title']()}
                </FieldLabel>
                <Input
                  disabled={isPending}
                  id="profile-name"
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
        </CardContent>
        <CardFooter className="justify-end">
          <Button loading={isPending} size="sm" type="submit">
            {m['actions.save']()}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
