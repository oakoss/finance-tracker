import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
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
import { Field, FieldLabel } from '@/components/ui/field';
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
  validateMapping,
} from '@/modules/imports/components/column-mapper';
import { ColumnMapperPreview } from '@/modules/imports/components/column-mapper-preview';
import { useCsvHeaders } from '@/modules/imports/hooks/use-csv-headers';
import { useCreateImport } from '@/modules/imports/hooks/use-imports';
import { autoDetectMapping } from '@/modules/imports/lib/auto-detect-mapping';
import { hashFileContent } from '@/modules/imports/lib/hash-file';
import { m } from '@/paraglide/messages';

export function ImportUploadDialog() {
  const search = useSearch({ from: '/_app/imports' });
  const navigate = useNavigate();
  const mutation = useCreateImport();
  const { data: accounts } = useSuspenseQuery(accountQueries.list());
  const csv = useCsvHeaders();

  const [accountId, setAccountId] = useState('');
  const [step, setStep] = useState(1);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(
    null,
  );
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);

  const [fileState, fileActions] = useFileUpload({
    accept: '.csv',
    maxSize: 5 * 1024 * 1024,
  });

  const open = search.modal === 'upload';

  const csvReset = csv.reset;
  const resetState = useCallback(() => {
    setAccountId('');
    setStep(1);
    setColumnMapping(null);
    setFileContent(null);
    setFileHash(null);
    csvReset();
    fileActions.clearFiles();
  }, [csvReset, fileActions]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        void navigate({ search: {}, to: '/imports' });
        resetState();
      }
    },
    [navigate, resetState],
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
    if (!file || !(file instanceof File) || !accountId) return;

    try {
      const content = await file.text();
      const hash = await hashFileContent(content);
      setFileContent(content);
      setFileHash(hash);
    } catch (error) {
      clientLog.error({ action: 'import.upload.readFile', error });
      toast.error(m['imports.toast.createError'](), {
        description: m['imports.toast.fileReadError'](),
      });
      return;
    }

    if (csv.result) {
      const detected = autoDetectMapping(csv.result.headers);
      setColumnMapping(detected);
    }

    setStep(2);
  }, [selectedFile, accountId, csv.result]);

  const handleSubmit = useCallback(() => {
    if (!fileContent || !fileHash || !accountId || !columnMapping) return;

    const errors = validateMapping(columnMapping);
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    mutation.mutate({
      accountId,
      columnMapping,
      fileContent,
      fileHash,
      fileName: selectedFile?.file.name ?? 'import.csv',
    });
  }, [fileContent, fileHash, accountId, columnMapping, mutation, selectedFile]);

  const canAdvance = !!accountId && !!selectedFile && !!csv.result;
  const canSubmit = !!columnMapping && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
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

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="import-account">
                {m['imports.upload.accountLabel']()}
              </FieldLabel>
              <Select
                disabled={mutation.isPending}
                value={accountId}
                onValueChange={(v) => {
                  if (v) setAccountId(v);
                }}
              >
                <SelectTrigger id="import-account">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.account.id} value={a.account.id}>
                      {a.account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>{m['imports.upload.dropzone']()}</FieldLabel>
              <div
                className={`flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                  fileState.isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
                role="button"
                tabIndex={0}
                onClick={fileActions.openFileDialog}
                onDragEnter={fileActions.handleDragEnter}
                onDragLeave={fileActions.handleDragLeave}
                onDragOver={fileActions.handleDragOver}
                onDrop={fileActions.handleDrop}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileActions.openFileDialog();
                  }
                }}
              >
                <input
                  {...fileActions.getInputProps({ className: 'sr-only' })}
                />
                {selectedFile ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Icons.File className="size-5 text-muted-foreground" />
                    <span>{selectedFile.file.name}</span>
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileActions.removeFile(selectedFile.id);
                        csvReset();
                      }}
                    >
                      <Icons.X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
                    <Icons.Upload className="size-8" />
                    <span>{m['imports.upload.dropzone']()}</span>
                  </div>
                )}
              </div>
              {fileState.errors.length > 0 && (
                <p className="text-sm text-destructive">
                  {fileState.errors[0]}
                </p>
              )}
              {csv.error && (
                <p className="text-sm text-destructive">{csv.error}</p>
              )}
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
            {columnMapping && csv.result && (
              <>
                <ColumnMapper
                  headers={csv.result.headers}
                  value={columnMapping}
                  onChange={setColumnMapping}
                />
                <ColumnMapperPreview
                  columnMapping={columnMapping}
                  sampleRows={csv.result.sampleRows}
                />
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 2 && (
            <Button
              disabled={mutation.isPending}
              variant="outline"
              onClick={() => setStep(1)}
            >
              {m['imports.upload.back']()}
            </Button>
          )}
          {step === 1 ? (
            <Button disabled={!canAdvance} onClick={() => void handleNext()}>
              {m['imports.upload.next']()}
            </Button>
          ) : (
            <Button disabled={!canSubmit} onClick={handleSubmit}>
              {mutation.isPending && (
                <Icons.Loader2 className="size-4 animate-spin" />
              )}
              {m['imports.upload.submit']()}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
