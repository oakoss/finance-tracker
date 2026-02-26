import { useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import { type } from 'arktype';
import { useState } from 'react';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RouterLink } from '@/components/ui/link';
import { PasswordInput } from '@/components/ui/password-input';
import { authClient } from '@/lib/auth-client';
import { clientLog } from '@/lib/logging/client-logger';
import { SocialSignIn } from '@/modules/auth/components/social-sign-in';
import { m } from '@/paraglide/messages';

const signInSchema = type({
  email: 'string.email',
  password: 'string > 0',
});

type SignInFormProps = {
  redirect?: string;
};

function SignInForm({ redirect }: SignInFormProps) {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setServerError('');

      try {
        const result = await authClient.signIn.email({
          email: value.email,
          password: value.password,
        });

        if (result.error) {
          clientLog.error({
            action: 'auth.login',
            error: result.error.message ?? 'Unknown sign-in error',
            outcome: { success: false },
          });
          setServerError(
            result.error.message ?? m['auth.error.signInFailed'](),
          );
        } else {
          const to =
            redirect && redirect.startsWith('/') && !redirect.startsWith('//')
              ? redirect
              : '/dashboard';
          void navigate({ to });
        }
      } catch (error) {
        clientLog.error({
          action: 'auth.login',
          error: error instanceof Error ? error.message : String(error),
          outcome: { success: false },
        });
        setServerError(m['auth.error.unexpected']());
      }
    },
    validators: {
      onBlur: signInSchema,
      onChange: signInSchema,
    },
  });

  return (
    <Card className="border-0 ring-0 shadow-none">
      <CardHeader className="justify-items-center text-center">
        <Icons.Logo className="size-8 mb-2" />
        <CardTitle>{m['auth.login.heading']()}</CardTitle>
        <CardDescription>{m['auth.login.subheading']()}</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.Field name="email">
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0}>
                <FieldLabel htmlFor="email">
                  {m['auth.login.emailLabel']()}
                </FieldLabel>
                <Input
                  disabled={form.state.isSubmitting}
                  id="email"
                  name={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0}>
                <FieldLabel htmlFor="password">
                  {m['auth.login.passwordLabel']()}
                </FieldLabel>
                <PasswordInput
                  disabled={form.state.isSubmitting}
                  id="password"
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          {serverError && (
            <div
              aria-live="polite"
              className="rounded-lg bg-destructive/10 border border-destructive/20 p-3"
              role="alert"
            >
              <p className="text-sm text-destructive">{serverError}</p>
            </div>
          )}

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button
                className="w-full"
                loading={isSubmitting}
                size="lg"
                type="submit"
              >
                {isSubmitting
                  ? m['auth.pleaseWait']()
                  : m['auth.login.submit']()}
              </Button>
            )}
          </form.Subscribe>
        </form>

        <SocialSignIn
          disabled={form.state.isSubmitting}
          onError={setServerError}
        />

        <p className="text-center text-sm text-muted-foreground">
          {m['auth.login.noAccount']()}{' '}
          <RouterLink to="/sign-up">{m['auth.login.signUpLink']()}</RouterLink>
        </p>
      </CardContent>
    </Card>
  );
}

export { SignInForm };
