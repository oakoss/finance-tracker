import { useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { appConfig } from '@/configs/app';
import { useAnalytics } from '@/hooks/use-analytics';
import { useHydrated } from '@/hooks/use-hydrated';
import { authClient } from '@/lib/auth/client';
import { fieldValidators } from '@/lib/form/field';
import { clientLog } from '@/lib/logging/client-logger';
import { SocialSignIn } from '@/modules/auth/components/social-sign-in';
import { emailType, nameType } from '@/modules/auth/lib/validate-field';
import { m } from '@/paraglide/messages';

const passwordRules = [
  () =>
    m['validation.password.minLength']({
      min: String(appConfig.passwordMinLength),
    }),
  () => m['validation.password.number'](),
  () => m['validation.password.special'](),
] as const;

function validatePassword(value: string): string[] | undefined {
  const errors: string[] = [];
  if (value.length < appConfig.passwordMinLength) {
    errors.push(passwordRules[0]());
  }
  if (!/\d/.test(value)) {
    errors.push(passwordRules[1]());
  }
  if (!/[^a-zA-Z0-9\s]/.test(value)) {
    errors.push(passwordRules[2]());
  }
  return errors.length > 0 ? errors : undefined;
}

const passwordValidators = {
  onBlur: ({ value }: { value: string }) => validatePassword(value),
  onSubmit: ({ value }: { value: string }) => validatePassword(value),
};

function SignUpForm() {
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const { capture } = useAnalytics();
  const [serverError, setServerError] = useState('');

  const form = useForm({
    defaultValues: { email: '', name: '', password: '' },
    onSubmit: async ({ value }) => {
      setServerError('');

      try {
        const result = await authClient.signUp.email({
          email: value.email,
          name: value.name,
          password: value.password,
        });

        if (result.error) {
          clientLog.error({
            action: 'auth.signup',
            error: result.error.message ?? 'Unknown sign-up error',
            outcome: { success: false },
          });
          setServerError(
            result.error.message ?? m['auth.error.signUpFailed'](),
          );
        } else {
          void navigate({ to: '/dashboard' });
          capture('user_signed_up', { method: 'email' });
        }
      } catch (error) {
        clientLog.error({
          action: 'auth.signup',
          error: error instanceof Error ? error.message : String(error),
          outcome: { success: false },
        });
        setServerError(m['auth.error.unexpected']());
      }
    },
  });

  return (
    <Card className="border-0 shadow-none ring-0">
      <CardHeader className="justify-items-center text-center">
        <Icons.Logo className="mb-2 size-8" />
        <CardTitle>{m['auth.signup.heading']()}</CardTitle>
        <CardDescription>{m['auth.signup.subheading']()}</CardDescription>
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
          <form.Field name="name" validators={fieldValidators(nameType)}>
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0}>
                <FieldLabel htmlFor="name">
                  {m['auth.signup.nameLabel']()}
                </FieldLabel>
                <Input
                  autoComplete="name"
                  id="name"
                  name={field.name}
                  type="text"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="email" validators={fieldValidators(emailType)}>
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0}>
                <FieldLabel htmlFor="email">
                  {m['auth.signup.emailLabel']()}
                </FieldLabel>
                <Input
                  autoComplete="email"
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

          <form.Field name="password" validators={passwordValidators}>
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0}>
                <div className="flex items-center gap-1.5">
                  <FieldLabel htmlFor="password">
                    {m['auth.signup.passwordLabel']()}
                  </FieldLabel>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        aria-label={m['auth.password.requirements']()}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Icons.Info aria-hidden="true" className="size-3.5" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="mb-1 font-medium">
                          {m['auth.password.requirements']()}
                        </p>
                        <ul className="space-y-0.5">
                          {passwordRules.map((rule) => {
                            const text = rule();
                            return <li key={text}>• {text}</li>;
                          })}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <PasswordInput
                  autoComplete="new-password"
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
              className="rounded-lg border border-destructive/20 bg-destructive/10 p-3"
              role="alert"
            >
              <p className="text-sm text-destructive">{serverError}</p>
            </div>
          )}

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button
                className="w-full"
                disabled={!hydrated}
                loading={isSubmitting}
                size="lg"
                type="submit"
              >
                {isSubmitting
                  ? m['auth.pleaseWait']()
                  : m['auth.signup.submit']()}
              </Button>
            )}
          </form.Subscribe>
        </form>

        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <SocialSignIn disabled={isSubmitting} onError={setServerError} />
          )}
        </form.Subscribe>

        <p className="text-center text-sm text-muted-foreground">
          {m['auth.signup.hasAccount']()}{' '}
          <RouterLink inline to="/sign-in">
            {m['auth.signup.signInLink']()}
          </RouterLink>
        </p>
      </CardContent>
    </Card>
  );
}

export { SignUpForm };
