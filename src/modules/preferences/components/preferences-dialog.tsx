import { useForm } from '@tanstack/react-form';
import { useQuery } from '@tanstack/react-query';

import { Icons } from '@/components/icons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  preferencesQueries,
  useUpdateUserPreferences,
} from '@/modules/preferences/hooks/use-preferences';
import { updateUserPreferencesSchema } from '@/modules/preferences/validators';
import { m } from '@/paraglide/messages';

const CURRENCY_CODES = Intl.supportedValuesOf('currency');
const TIME_ZONES = Intl.supportedValuesOf('timeZone');
// Locale list is intentionally minimal for MVP. Wired for future
// locales — add entries as translations ship.
const LOCALES = ['en-US'] as const;

type PreferencesDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function PreferencesDialog({
  onOpenChange,
  open,
}: PreferencesDialogProps) {
  if (!open) return null;
  return <PreferencesDialogContent onOpenChange={onOpenChange} />;
}

function PreferencesDialogContent({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading } = useQuery(preferencesQueries.detail());
  const mutation = useUpdateUserPreferences({
    onSuccess: () => onOpenChange(false),
  });

  const isUsingDefaults = data?.isDefault === true;
  const current = data?.preferences;

  const localeItems = Object.fromEntries(
    LOCALES.map((l) => [l, m[`preferences.locale.${l}`]()]),
  );

  const form = useForm({
    defaultValues: {
      defaultCurrency: current?.defaultCurrency ?? 'USD',
      locale: current?.locale ?? 'en-US',
      timeZone: current?.timeZone ?? 'UTC',
    },
    onSubmit: ({ value }) => mutation.mutate(value),
    validators: { onSubmit: updateUserPreferencesSchema },
  });

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m['preferences.title']()}</DialogTitle>
          <DialogDescription>
            {m['preferences.description']()}
          </DialogDescription>
        </DialogHeader>

        {isUsingDefaults && (
          <Alert variant="warning">
            <Icons.TriangleAlert />
            <AlertDescription>
              {m['preferences.warning.usingDefaults']()}
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="grid gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <form
            noValidate
            className="grid gap-4"
            id="preferences-form"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void form.handleSubmit();
            }}
          >
            <form.Field name="locale">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="preferences-locale">
                    {m['preferences.form.locale']()}
                  </FieldLabel>
                  <Select
                    disabled={mutation.isPending}
                    items={localeItems}
                    value={field.state.value}
                    onValueChange={(v) => {
                      if (v) {
                        field.handleChange(v);
                        field.handleBlur();
                      }
                    }}
                  >
                    <SelectTrigger id="preferences-locale">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCALES.map((l) => (
                        <SelectItem key={l} value={l}>
                          {localeItems[l]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>

            <form.Field name="defaultCurrency">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor="preferences-currency">
                    {m['preferences.form.currency']()}
                  </FieldLabel>
                  <Combobox
                    items={CURRENCY_CODES}
                    value={field.state.value}
                    onValueChange={(v) => {
                      if (v) field.handleChange(v);
                    }}
                  >
                    <ComboboxInput
                      disabled={mutation.isPending}
                      id="preferences-currency"
                      placeholder="USD"
                      onBlur={field.handleBlur}
                    />
                    <ComboboxContent>
                      <ComboboxList>
                        <ComboboxEmpty>
                          {m['filters.noResultsFound']()}
                        </ComboboxEmpty>
                        <ComboboxCollection>
                          {(code: string) => (
                            <ComboboxItem key={code} value={code}>
                              {code}
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>

            <form.Field name="timeZone">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor="preferences-time-zone">
                    {m['preferences.form.timeZone']()}
                  </FieldLabel>
                  <Combobox
                    items={TIME_ZONES}
                    value={field.state.value}
                    onValueChange={(v) => {
                      if (v) field.handleChange(v);
                    }}
                  >
                    <ComboboxInput
                      disabled={mutation.isPending}
                      id="preferences-time-zone"
                      placeholder="UTC"
                      onBlur={field.handleBlur}
                    />
                    <ComboboxContent>
                      <ComboboxList>
                        <ComboboxEmpty>
                          {m['filters.noResultsFound']()}
                        </ComboboxEmpty>
                        <ComboboxCollection>
                          {(tz: string) => (
                            <ComboboxItem key={tz} value={tz}>
                              {tz}
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
          </form>
        )}

        <DialogFooter>
          <Button
            disabled={mutation.isPending}
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {m['actions.cancel']()}
          </Button>
          <Button
            disabled={isLoading}
            form="preferences-form"
            loading={mutation.isPending}
            type="submit"
          >
            {m['actions.save']()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
