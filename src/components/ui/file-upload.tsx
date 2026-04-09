import type { ReactNode } from 'react';

import type {
  FileUploadActions,
  FileUploadState,
} from '@/hooks/use-file-upload';

import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

export type FileUploadProps = {
  actions: FileUploadActions;
  className?: string;
  emptyHint?: string;
  emptyLabel: string;
  icon?: ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
  state: FileUploadState;
};

export function FileUpload({
  actions,
  className,
  emptyHint,
  emptyLabel,
  icon,
  onRemove,
  removeLabel = 'Remove file',
  state,
}: FileUploadProps) {
  const selectedFile = state.files[0];

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          'relative flex min-h-32 flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
          state.isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          className,
        )}
        onDragEnter={actions.handleDragEnter}
        onDragLeave={actions.handleDragLeave}
        onDragOver={actions.handleDragOver}
        onDrop={actions.handleDrop}
      >
        <input {...actions.getInputProps({ className: 'sr-only' })} />
        {selectedFile ? (
          <div className="flex items-center gap-2 p-6 text-sm">
            <Icons.File className="size-5 text-muted-icon" />
            <span>{selectedFile.file.name}</span>
            <button
              aria-label={removeLabel}
              className="text-muted-foreground hover:text-foreground"
              type="button"
              onClick={() => {
                actions.removeFile(selectedFile.id);
                onRemove?.();
              }}
            >
              <Icons.X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            className="flex w-full flex-1 flex-col items-center justify-center gap-1 rounded-lg p-6 text-sm text-muted-foreground"
            type="button"
            onClick={actions.openFileDialog}
          >
            {icon ?? <Icons.Upload className="size-8" />}
            <span>{emptyLabel}</span>
            {emptyHint && <span className="text-xs">{emptyHint}</span>}
          </button>
        )}
      </div>
      {state.errors.length > 0 && (
        <p className="text-sm text-destructive">{state.errors[0]}</p>
      )}
    </div>
  );
}
