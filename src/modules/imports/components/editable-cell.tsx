import { useCallback, useRef, useState } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type EditableCellProps = {
  className?: string;
  disabled?: boolean;
  formatDisplay?: (value: string) => string;
  onSave: (value: string) => void;
  value: string;
};

export function EditableCell({
  className,
  disabled,
  formatDisplay,
  onSave,
  value,
}: EditableCellProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = draft !== null;

  const startEditing = useCallback(() => {
    setDraft(value);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [value]);

  const handleSave = useCallback(() => {
    if (draft !== null && draft.trim() !== value) onSave(draft.trim());
    setDraft(null);
  }, [draft, onSave, value]);

  const handleCancel = useCallback(() => {
    setDraft(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    },
    [handleCancel, handleSave],
  );

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        className="h-7 text-sm"
        value={draft}
        onBlur={handleSave}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <span
      className={cn(
        'block truncate',
        disabled
          ? 'text-muted-foreground'
          : '-mx-1 cursor-pointer rounded-sm px-1 hover:bg-muted/60',
        className,
      )}
      role={disabled ? undefined : 'button'}
      tabIndex={disabled ? undefined : 0}
      onClick={disabled ? undefined : startEditing}
      onKeyDown={
        disabled
          ? undefined
          : (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                startEditing();
              }
            }
      }
    >
      {formatDisplay ? formatDisplay(value) : value || '—'}
    </span>
  );
}
