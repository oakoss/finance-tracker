import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

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
import { useFileUpload } from '@/hooks/use-file-upload';
import { clientLog } from '@/lib/logging/client-logger';
import { accountQueries } from '@/modules/accounts/hooks/use-accounts';
import { useCreateImport } from '@/modules/imports/hooks/use-imports';
import { hashFileContent } from '@/modules/imports/lib/hash-file';
import { m } from '@/paraglide/messages';

export function ImportUploadDialog() {
  const search = useSearch({ from: '/_app/imports' });
  const navigate = useNavigate();
  const mutation = useCreateImport();
  const { data: accounts } = useSuspenseQuery(accountQueries.list());

  const [accountId, setAccountId] = useState('');

  const [fileState, fileActions] = useFileUpload({
    accept: '.csv',
    maxSize: 5 * 1024 * 1024,
  });

  const open = search.modal === 'upload';

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        void navigate({ search: {}, to: '/imports' });
        setAccountId('');
        fileActions.clearFiles();
      }
    },
    [navigate, fileActions],
  );

  const handleSubmit = useCallback(async () => {
    const file = fileState.files[0]?.file;
    if (!file || !(file instanceof File) || !accountId) return;

    let content: string;
    let fileHash: string;

    try {
      content = await file.text();
      fileHash = await hashFileContent(content);
    } catch (error) {
      clientLog.error({ action: 'import.upload.readFile', error });
      toast.error(m['imports.toast.createError'](), {
        description: m['imports.toast.fileReadError'](),
      });
      return;
    }

    mutation.mutate({
      accountId,
      fileContent: content,
      fileHash,
      fileName: file.name,
    });
  }, [fileState.files, accountId, mutation]);

  const selectedFile = fileState.files[0];
  const canSubmit = !!accountId && !!selectedFile && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m['imports.upload.title']()}</DialogTitle>
          <DialogDescription>
            {m['imports.upload.description']()}
          </DialogDescription>
        </DialogHeader>

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
              <input {...fileActions.getInputProps({ className: 'sr-only' })} />
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
              <p className="text-sm text-destructive">{fileState.errors[0]}</p>
            )}
          </Field>
        </div>

        <DialogFooter>
          <Button disabled={!canSubmit} onClick={() => void handleSubmit()}>
            {mutation.isPending && (
              <Icons.Loader2 className="size-4 animate-spin" />
            )}
            {m['imports.upload.submit']()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
