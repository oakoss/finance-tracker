import { useForm } from '@tanstack/react-form';
import { useRouteContext } from '@tanstack/react-router';
import { type } from 'arktype';
import { useState } from 'react';
import { toast } from 'sonner';

import { Icons } from '@/components/icons';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

const emailSchema = type({ newEmail: 'string.email' });

export function ProfileEmailSection() {
  const { session } = useRouteContext({ from: '/_app' });
  const [editing, setEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm({
    defaultValues: { newEmail: '' },
    onSubmit: async ({ value }) => {
      setIsPending(true);
      try {
        const result = await authClient.changeEmail({
          newEmail: value.newEmail,
        });
        if (result.error) {
          clientLog.error({
            action: 'profile.email.change.failed',
            error: result.error.message,
          });
          toast.error(m['profile.toast.emailError'](), {
            description: result.error.message,
          });
          return;
        }
        setEmailSent(true);
        setEditing(false);
        toast.success(m['profile.changeEmail.sent']());
      } catch (error) {
        const parsed = parseError(error);
        clientLog.error({
          action: 'profile.email.change.failed',
          error: parsed.message,
        });
        toast.error(m['profile.toast.emailError'](), {
          description: parsed.fix ?? parsed.why,
        });
      } finally {
        setIsPending(false);
      }
    },
    validators: { onSubmit: emailSchema },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m['profile.email.title']()}</CardTitle>
        <CardDescription>{session.user.email}</CardDescription>
      </CardHeader>

      {emailSent && (
        <CardContent>
          <Alert variant="info">
            <Icons.Mail />
            <AlertDescription>
              {m['profile.changeEmail.sent']()}
            </AlertDescription>
          </Alert>
        </CardContent>
      )}

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
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              {m['profile.changeEmail.description']()}
            </p>
            <form.Field name="newEmail">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor="profile-new-email">
                    {m['profile.changeEmail.title']()}
                  </FieldLabel>
                  <Input
                    autoComplete="email"
                    disabled={isPending}
                    id="profile-new-email"
                    name={field.name}
                    placeholder={session.user.email}
                    type="email"
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
              onClick={() => setEditing(false)}
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditing(true);
              setEmailSent(false);
            }}
          >
            {m['profile.changeEmail.title']()}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
