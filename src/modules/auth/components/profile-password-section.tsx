import { useForm } from '@tanstack/react-form';
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
import { PasswordInput } from '@/components/ui/password-input';
import { authClient } from '@/lib/auth/client';
import { clientLog } from '@/lib/logging/client-logger';
import { parseError } from '@/lib/logging/evlog';
import { m } from '@/paraglide/messages';

const passwordSchema = type({
  currentPassword: 'string > 0',
  newPassword: 'string >= 8',
});

export function ProfilePasswordSection() {
  const [editing, setEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const form = useForm({
    defaultValues: { currentPassword: '', newPassword: '' },
    onSubmit: async ({ value }) => {
      setIsPending(true);
      try {
        const result = await authClient.changePassword({
          currentPassword: value.currentPassword,
          newPassword: value.newPassword,
        });
        if (result.error) {
          clientLog.error({
            action: 'profile.password.change.failed',
            error: result.error.message,
          });
          toast.error(m['profile.toast.passwordError'](), {
            description: result.error.message,
          });
          return;
        }
        toast.success(m['profile.toast.passwordSuccess']());
        setEditing(false);
        form.reset();
      } catch (error) {
        const parsed = parseError(error);
        clientLog.error({
          action: 'profile.password.change.failed',
          error: parsed.message,
        });
        toast.error(m['profile.toast.passwordError'](), {
          description: parsed.fix ?? parsed.why,
        });
      } finally {
        setIsPending(false);
      }
    },
    validators: { onSubmit: passwordSchema },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m['profile.password.title']()}</CardTitle>
        <CardDescription>{m['profile.changePassword.title']()}</CardDescription>
      </CardHeader>

      {editing ? (
        <form
          noValidate
          className="contents"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <CardContent className="grid gap-4">
            <form.Field name="currentPassword">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor="current-password">
                    {m['profile.field.currentPassword']()}
                  </FieldLabel>
                  <PasswordInput
                    autoComplete="current-password"
                    disabled={isPending}
                    id="current-password"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
            <form.Field name="newPassword">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor="new-password">
                    {m['profile.field.newPassword']()}
                  </FieldLabel>
                  <PasswordInput
                    autoComplete="new-password"
                    disabled={isPending}
                    id="new-password"
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
          <CardFooter className="justify-end gap-2">
            <Button
              disabled={isPending}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(false);
                form.reset();
              }}
            >
              {m['actions.cancel']()}
            </Button>
            <Button loading={isPending} size="sm" type="submit">
              {m['actions.save']()}
            </Button>
          </CardFooter>
        </form>
      ) : (
        <CardFooter className="justify-end">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            {m['profile.changePassword.title']()}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
