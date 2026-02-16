# Form Examples

These examples follow our Base UI + TanStack + ArkType rules and pass lint,
format, and typecheck. Replace the placeholder mutation functions with real
TanStack Start server functions when wiring forms to the backend.

## Basic form (ArkType + mutation)

```tsx
'use client';

import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { type } from 'arktype';

import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const basicFormSchema = type({
  message: 'string',
  name: 'string',
});

type BasicFormValues = typeof basicFormSchema.infer;

function submitBasicForm(value: BasicFormValues) {
  return Promise.resolve(value);
}

export function BasicFormExample() {
  const mutation = useMutation({
    mutationFn: submitBasicForm,
  });

  const form = useForm({
    defaultValues: {
      message: '',
      name: '',
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
    validators: {
      onSubmit: basicFormSchema,
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field name="name">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                <Input
                  aria-invalid={isInvalid}
                  autoComplete="name"
                  id={field.name}
                  name={field.name}
                  placeholder="Taylor"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                <FieldDescription>Tell us who is submitting.</FieldDescription>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>
        <form.Field name="message">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Message</FieldLabel>
                <Textarea
                  aria-invalid={isInvalid}
                  id={field.name}
                  name={field.name}
                  placeholder="Share a short note."
                  rows={4}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                <FieldDescription>Keep it brief.</FieldDescription>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>
      </FieldGroup>
      <Button disabled={mutation.isPending} type="submit">
        {mutation.isPending ? 'Submitting...' : 'Submit'}
      </Button>
    </form>
  );
}
```

## Conditional inputs

```tsx
'use client';

import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { type } from 'arktype';

import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const conditionalFormSchema = type({
  'email?': 'string.email',
  contactMethod: 'string',
  'phone?': 'string',
});

type ConditionalFormValues = typeof conditionalFormSchema.infer;

function submitConditionalForm(value: ConditionalFormValues) {
  return Promise.resolve(value);
}

export function ConditionalFormExample() {
  const mutation = useMutation({
    mutationFn: submitConditionalForm,
  });

  const form = useForm({
    defaultValues: {
      contactMethod: 'email',
      email: '',
      phone: '',
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
    validators: {
      onSubmit: conditionalFormSchema,
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field name="contactMethod">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor="contact-method">Contact method</FieldLabel>
                <Select
                  name={field.name}
                  value={field.state.value}
                  onValueChange={(value = 'email') => {
                    const nextValue = value ?? 'email';
                    field.handleChange(nextValue);
                    if (nextValue === 'email') {
                      form.setFieldValue('phone', '');
                    } else {
                      form.setFieldValue('email', '');
                    }
                  }}
                >
                  <SelectTrigger aria-invalid={isInvalid} id="contact-method">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Choose the best way to reach you.
                </FieldDescription>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>
        <form.Subscribe selector={(state) => state.values.contactMethod}>
          {(contactMethod) =>
            contactMethod === 'email' ? (
              <form.Field
                name="email"
                validators={{
                  onBlur: ({ value }) =>
                    value.length === 0
                      ? { message: 'Email is required.' }
                      : undefined,
                }}
              >
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                      <Input
                        aria-invalid={isInvalid}
                        autoComplete="email"
                        id={field.name}
                        name={field.name}
                        placeholder="you@example.com"
                        type="email"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>
            ) : (
              <form.Field
                name="phone"
                validators={{
                  onBlur: ({ value }) =>
                    value.length === 0
                      ? { message: 'Phone is required.' }
                      : undefined,
                }}
              >
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Phone</FieldLabel>
                      <Input
                        aria-invalid={isInvalid}
                        autoComplete="tel"
                        id={field.name}
                        name={field.name}
                        placeholder="(555) 000-0000"
                        type="tel"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>
            )
          }
        </form.Subscribe>
      </FieldGroup>
      <Button disabled={mutation.isPending} type="submit">
        {mutation.isPending ? 'Saving...' : 'Save'}
      </Button>
    </form>
  );
}
```

## Multi-step wizard

```tsx
'use client';

import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { type } from 'arktype';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

const wizardFormSchema = type({
  company: 'string',
  email: 'string.email',
  name: 'string',
  role: 'string',
});

type WizardFormValues = typeof wizardFormSchema.infer;

function submitWizardForm(value: WizardFormValues) {
  return Promise.resolve(value);
}

export function WizardFormExample() {
  const [step, setStep] = React.useState(0);
  const mutation = useMutation({
    mutationFn: submitWizardForm,
  });

  const form = useForm({
    defaultValues: {
      company: '',
      email: '',
      name: '',
      role: '',
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
    validators: {
      onSubmit: wizardFormSchema,
    },
  });

  const isFinalStep = step === 1;

  const handleNext = async () => {
    await form.validate('submit');
    if (!form.state.isValid) {
      return;
    }
    setStep(1);
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        {step === 0 ? (
          <>
            <form.Field name="name">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Full name</FieldLabel>
                    <Input
                      aria-invalid={isInvalid}
                      autoComplete="name"
                      id={field.name}
                      name={field.name}
                      placeholder="Jordan Lee"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>
            <form.Field name="email">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Work email</FieldLabel>
                    <Input
                      aria-invalid={isInvalid}
                      autoComplete="email"
                      id={field.name}
                      name={field.name}
                      placeholder="jordan@company.com"
                      type="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                    <FieldDescription>
                      We&#39;ll only use this to contact you.
                    </FieldDescription>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>
          </>
        ) : (
          <>
            <form.Field name="company">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Company</FieldLabel>
                    <Input
                      aria-invalid={isInvalid}
                      autoComplete="organization"
                      id={field.name}
                      name={field.name}
                      placeholder="Oakoss"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>
            <form.Field name="role">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Role</FieldLabel>
                    <Input
                      aria-invalid={isInvalid}
                      autoComplete="organization-title"
                      id={field.name}
                      name={field.name}
                      placeholder="Finance lead"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>
          </>
        )}
      </FieldGroup>
      <div className="flex gap-3">
        <Button
          disabled={step === 0}
          type="button"
          variant="outline"
          onClick={() => setStep(0)}
        >
          Back
        </Button>
        {isFinalStep ? (
          <Button disabled={mutation.isPending} type="submit">
            {mutation.isPending ? 'Submitting...' : 'Submit'}
          </Button>
        ) : (
          <Button type="button" onClick={handleNext}>
            Next
          </Button>
        )}
      </div>
    </form>
  );
}
```

## Field-level validators (sync + async)

```tsx
'use client';

import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { type } from 'arktype';

import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

const fieldSchema = type({
  email: 'string.email',
});

const emailSchema = type('string.email');

type FieldValidatorValues = typeof fieldSchema.infer;

function submitFieldValidatorForm(value: FieldValidatorValues) {
  return Promise.resolve(value);
}

async function isEmailAvailable(value: string) {
  await new Promise((resolve) => {
    setTimeout(resolve, 200);
  });
  return value !== 'taken@example.com';
}

export function FieldValidatorsExample() {
  const mutation = useMutation({
    mutationFn: submitFieldValidatorForm,
  });

  const form = useForm({
    defaultValues: {
      email: '',
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
    validators: {
      onSubmit: fieldSchema,
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field
          name="email"
          validators={{
            onBlur: emailSchema,
            onChangeAsync: async ({ value }) => {
              const available = await isEmailAvailable(value);
              return available
                ? undefined
                : { message: 'Email is already in use.' };
            },
          }}
        >
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            const errors = field.state.meta.errors.flatMap((error) => {
              if (!error) {
                return [];
              }

              if (typeof error === 'string') {
                return [{ message: error }];
              }

              if (
                typeof error === 'object' &&
                'message' in error &&
                typeof error.message === 'string'
              ) {
                return [{ message: error.message }];
              }

              return [{ message: 'Invalid value.' }];
            });

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Work email</FieldLabel>
                <Input
                  aria-invalid={isInvalid}
                  autoComplete="email"
                  id={field.name}
                  name={field.name}
                  placeholder="you@company.com"
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                {isInvalid && <FieldError errors={errors} />}
              </Field>
            );
          }}
        </form.Field>
      </FieldGroup>
      <Button disabled={mutation.isPending} type="submit">
        {mutation.isPending ? 'Submitting...' : 'Submit'}
      </Button>
    </form>
  );
}
```
