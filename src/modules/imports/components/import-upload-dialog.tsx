import { useForm } from '@tanstack/react-form';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { ColumnMapping } from '@/modules/imports/validators';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { FileUpload } from '@/components/ui/file-upload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper';
import { useFileUpload } from '@/hooks/use-file-upload';
import { clientLog } from '@/lib/logging/client-logger';
import { accountQueries } from '@/modules/accounts/hooks/use-accounts';
import {
  ColumnMapper,
  type MappingValidation,
  validateMapping,
} from '@/modules/imports/components/column-mapper';
import { ColumnMapperPreview } from '@/modules/imports/components/column-mapper-preview';
import { useCsvHeaders } from '@/modules/imports/hooks/use-csv-headers';
import { useCreateImport } from '@/modules/imports/hooks/use-imports';
import { autoDetectMapping } from '@/modules/imports/lib/auto-detect-mapping';
import { hashFileContent } from '@/modules/imports/lib/hash-file';
import { m } from '@/paraglide/messages';

function formatMappingErrors(mapping: ColumnMapping): string | undefined {
  const { errors } = validateMapping(mapping);
  return errors.length > 0 ? errors.join('. ') : undefined;
}

function getMappingValidation(
  mapping: ColumnMapping,
  hasErrors: boolean,
): MappingValidation | undefined {
  return hasErrors ? validateMapping(mapping) : undefined;
}

export function ImportUploadDialog() {
  const search = useSearch({ from: '/_app/imports/' });
  const navigate = useNavigate();
  const mutation = useCreateImport();
  const { data: accounts } = useSuspenseQuery(accountQueries.list());
  const csv = useCsvHeaders();

  const accountItems = useMemo(
    () =>
      Object.fromEntries(accounts.map((a) => [a.account.id, a.account.name])),
    [accounts],
  );

  const [step, setStep] = useState(1);

  const [fileState, fileActions] = useFileUpload({
    accept: '.csv',
    maxSize: 5 * 1024 * 1024,
  });

  const form = useForm({
    defaultValues: {
      accountId: '',
      columnMapping: null as ColumnMapping | null,
      fileContent: '',
      fileHash: '',
      fileName: '',
    },
    onSubmit: ({ value }) => {
      if (
        !value.accountId ||
        !value.columnMapping ||
        !value.fileContent ||
        !value.fileHash
      ) {
        clientLog.error({
          action: 'import.upload.submit',
          outcome: {
            accountId: !!value.accountId,
            columnMapping: !!value.columnMapping,
            fileContent: !!value.fileContent,
            fileHash: !!value.fileHash,
          },
        });
        toast.error(m['imports.toast.createError']());
        return;
      }
      mutation.mutate({
        accountId: value.accountId,
        columnMapping: value.columnMapping,
        fileContent: value.fileContent,
        fileHash: value.fileHash,
        fileName: value.fileName || 'import.csv',
      });
    },
  });

  const open = search.modal === 'upload';

  const csvReset = csv.reset;
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        void navigate({ search: {}, to: '/imports' });
        form.reset();
        setStep(1);
        csvReset();
        fileActions.clearFiles();
      }
    },
    [navigate, form, csvReset, fileActions],
  );

  const selectedFile = fileState.files[0];
  const selectedFileId = selectedFile?.id;
  const selectedFileRef = selectedFile?.file;
  const parseCsvFile = csv.parseFile;
  useEffect(() => {
    if (selectedFileRef instanceof File) {
      parseCsvFile(selectedFileRef);
    }
  }, [selectedFileId, selectedFileRef, parseCsvFile]);

  const handleNext = useCallback(async () => {
    const file = selectedFile?.file;
    if (!file || !(file instanceof File)) return;
    if (!form.state.values.accountId) return;

    try {
      const content = await file.text();
      const hash = await hashFileContent(content);
      form.setFieldValue('fileContent', content);
      form.setFieldValue('fileHash', hash);
      form.setFieldValue('fileName', file.name);
    } catch (error) {
      clientLog.error({ action: 'import.upload.readFile', error });
      toast.error(m['imports.toast.createError'](), {
        description: m['imports.toast.fileReadError'](),
      });
      return;
    }

    if (!csv.result) {
      toast.error(m['imports.toast.createError'](), {
        description: m['imports.upload.csvParseError'](),
      });
      return;
    }

    const detected = autoDetectMapping(csv.result.headers);
    form.setFieldValue('columnMapping', detected);
    setStep(2);
  }, [selectedFile, csv.result, form]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{m['imports.upload.title']()}</DialogTitle>
          <DialogDescription>
            {step === 1
              ? m['imports.upload.description']()
              : m['imports.upload.mapColumnsDescription']()}
          </DialogDescription>
        </DialogHeader>

        <Stepper value={step}>
          <StepperNav>
            <StepperItem step={1}>
              <StepperTrigger asChild>
                <StepperIndicator>1</StepperIndicator>
              </StepperTrigger>
              <StepperTitle>{m['imports.upload.step.upload']()}</StepperTitle>
              <StepperSeparator />
            </StepperItem>
            <StepperItem step={2}>
              <StepperTrigger asChild>
                <StepperIndicator>2</StepperIndicator>
              </StepperTrigger>
              <StepperTitle>
                {m['imports.upload.step.mapColumns']()}
              </StepperTitle>
            </StepperItem>
          </StepperNav>
        </Stepper>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
        >
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <form.Field
                name="accountId"
                validators={{
                  onChange: (params) => {
                    if (params.fieldApi.form.state.submissionAttempts === 0)
                      return;
                    return !params.value
                      ? m['imports.upload.accountRequired']()
                      : undefined;
                  },
                  onSubmit: ({ value }) =>
                    !value ? m['imports.upload.accountRequired']() : undefined,
                }}
              >
                {(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor="import-account">
                      {m['imports.upload.accountLabel']()}
                    </FieldLabel>
                    <Select
                      disabled={mutation.isPending}
                      items={accountItems}
                      value={field.state.value}
                      onValueChange={(v) => {
                        if (v) {
                          field.handleChange(v);
                          field.handleBlur();
                        }
                      }}
                    >
                      <SelectTrigger id="import-account">
                        <SelectValue
                          placeholder={m['imports.upload.accountPlaceholder']()}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            {m['imports.upload.noAccounts']()}
                          </div>
                        ) : (
                          accounts.map((a) => (
                            <SelectItem key={a.account.id} value={a.account.id}>
                              {a.account.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>

              <Field>
                <FieldLabel>{m['imports.upload.dropzone']()}</FieldLabel>
                <FileUpload
                  actions={fileActions}
                  emptyLabel={m['imports.upload.dropzone']()}
                  removeLabel={m['imports.upload.removeFile']()}
                  state={fileState}
                  onRemove={csvReset}
                />
                {csv.error && (
                  <p className="text-sm text-destructive">{csv.error}</p>
                )}
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
              <form.Field
                name="columnMapping"
                validators={{
                  onChange: (params) => {
                    if (params.fieldApi.form.state.submissionAttempts === 0)
                      return;
                    if (!params.value) return;
                    return formatMappingErrors(params.value);
                  },
                  onSubmit: ({ value }) => {
                    if (!value)
                      return m['imports.upload.columnMappingRequired']();
                    return formatMappingErrors(value);
                  },
                }}
              >
                {(field) => {
                  if (!field.state.value || !csv.result) return null;
                  const validation = getMappingValidation(
                    field.state.value,
                    field.state.meta.errors.length > 0,
                  );
                  return (
                    <>
                      <ColumnMapper
                        duplicateFields={validation?.duplicateFields}
                        headers={csv.result.headers}
                        value={field.state.value}
                        onChange={field.handleChange}
                      />
                      <FieldError errors={field.state.meta.errors} />
                      <ColumnMapperPreview
                        columnMapping={field.state.value}
                        sampleRows={csv.result.sampleRows}
                      />
                    </>
                  );
                }}
              </form.Field>
            </div>
          )}

          <DialogFooter className="mt-4">
            {step === 2 && (
              <Button
                disabled={mutation.isPending}
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
              >
                {m['imports.upload.back']()}
              </Button>
            )}
            {step === 1 ? (
              <form.Subscribe selector={(s) => s.values.accountId}>
                {(accountId) => (
                  <Button
                    disabled={!accountId || !selectedFile || !csv.result}
                    type="button"
                    onClick={() => void handleNext()}
                  >
                    {m['imports.upload.next']()}
                  </Button>
                )}
              </form.Subscribe>
            ) : (
              <Button disabled={mutation.isPending} type="submit">
                {mutation.isPending && (
                  <Icons.Loader2 className="size-4 animate-spin" />
                )}
                {m['imports.upload.submit']()}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
