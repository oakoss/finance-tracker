import { useEffect, useId, useMemo, useRef, useState } from 'react';

import type { FilterFieldConfig } from '@/components/filters/types';

import { renderIcon } from '@/components/filters/helpers';
import {
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages';

type SubmenuContentProps<T = unknown> = {
  currentValues: T[];
  field: FilterFieldConfig<T>;
  isActive?: boolean;
  isMultiSelect: boolean;
  onActive?: () => void;
  onBack?: () => void;
  onClose?: () => void;
  onToggle: (value: T, isSelected: boolean) => void;
};

function SubmenuContent<T = unknown>({
  currentValues,
  field,
  isActive,
  isMultiSelect,
  onActive,
  onBack,
  onClose,
  onToggle,
}: SubmenuContentProps<T>) {
  const [searchInput, setSearchInput] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const baseId = useId();

  useEffect(() => {
    if (isActive) {
      if (field.searchable === false) {
        const listbox = document.querySelector<HTMLElement>(
          `#${CSS.escape(`${baseId}-listbox`)}`,
        );
        listbox?.focus();
      } else {
        inputRef.current?.focus();
      }
    }
  }, [isActive, field.searchable, baseId]);

  useEffect(() => {
    if (highlightedIndex >= 0 && isActive) {
      const itemId = `${baseId}-item-${highlightedIndex}`;
      const element = document.querySelector<HTMLElement>(
        `#${CSS.escape(itemId)}`,
      );
      element?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isActive, baseId]);

  const filteredOptions = useMemo(() => {
    return (
      field.options?.filter((option) => {
        const isSelected = currentValues.includes(option.value);
        if (isSelected) return true;
        if (!searchInput) return true;
        return option.label.toLowerCase().includes(searchInput.toLowerCase());
      }) ?? []
    );
  }, [field.options, searchInput, currentValues]);

  function handleActivate() {
    if (filteredOptions.length > 0) {
      setHighlightedIndex((prev) => (prev === -1 ? 0 : prev));
    }
    onActive?.();
  }

  return (
    <div className="flex flex-col">
      {field.searchable !== false && (
        <>
          <Input
            ref={inputRef}
            aria-activedescendant={
              highlightedIndex >= 0
                ? `${baseId}-item-${highlightedIndex}`
                : undefined
            }
            aria-autocomplete="list"
            aria-controls={`${baseId}-listbox`}
            aria-expanded={true}
            aria-haspopup="listbox"
            className={cn(
              'h-8 rounded-none border-0 bg-transparent! px-2 text-sm shadow-none',
              'focus-visible:border-border focus-visible:ring-0 focus-visible:ring-offset-0',
              isActive && 'placeholder:text-foreground',
            )}
            placeholder={m['filters.searchField']({
              fieldName: (field.label ?? '').toLowerCase(),
            })}
            role="combobox"
            value={searchInput}
            onBlur={() => isActive && inputRef.current?.focus()}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setHighlightedIndex(-1);
            }}
            onClick={(e) => e.stopPropagation()}
            onFocus={handleActivate}
            onKeyDown={(e) => {
              switch (e.key) {
                case 'ArrowDown': {
                  e.preventDefault();
                  if (filteredOptions.length > 0) {
                    setHighlightedIndex((prev) =>
                      prev < filteredOptions.length - 1 ? prev + 1 : 0,
                    );
                  }

                  break;
                }
                case 'ArrowUp': {
                  e.preventDefault();
                  if (filteredOptions.length > 0) {
                    setHighlightedIndex((prev) =>
                      prev > 0 ? prev - 1 : filteredOptions.length - 1,
                    );
                  }

                  break;
                }
                case 'ArrowLeft': {
                  e.preventDefault();
                  onBack?.();

                  break;
                }
                default: {
                  if (e.key === 'Enter' && highlightedIndex >= 0) {
                    e.preventDefault();
                    const option = filteredOptions[highlightedIndex];
                    if (option) {
                      onToggle(
                        option.value,
                        currentValues.includes(option.value),
                      );
                      if (!isMultiSelect) {
                        onBack?.();
                      }
                    }
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    onClose?.();
                  }
                }
              }
              e.stopPropagation();
            }}
            onMouseEnter={(e) => {
              handleActivate();
              e.stopPropagation();
            }}
          />
          <DropdownMenuSeparator />
        </>
      )}
      <div className="relative flex max-h-full">
        <div
          className="flex max-h-[min(var(--available-height),24rem)] w-full scroll-py-2 flex-col overscroll-contain outline-hidden"
          id={`${baseId}-listbox`}
          role="listbox"
          tabIndex={field.searchable === false ? 0 : -1}
          onKeyDown={(e) => {
            if (field.searchable === false) {
              switch (e.key) {
                case 'ArrowDown': {
                  e.preventDefault();
                  if (filteredOptions.length > 0) {
                    setHighlightedIndex((prev) =>
                      prev < filteredOptions.length - 1 ? prev + 1 : 0,
                    );
                  }

                  break;
                }
                case 'ArrowUp': {
                  e.preventDefault();
                  if (filteredOptions.length > 0) {
                    setHighlightedIndex((prev) =>
                      prev > 0 ? prev - 1 : filteredOptions.length - 1,
                    );
                  }

                  break;
                }
                case 'ArrowLeft': {
                  e.preventDefault();
                  onBack?.();

                  break;
                }
                default: {
                  if (e.key === 'Enter' && highlightedIndex >= 0) {
                    e.preventDefault();
                    const option = filteredOptions[highlightedIndex];
                    if (option) {
                      onToggle(
                        option.value,
                        currentValues.includes(option.value),
                      );
                      if (!isMultiSelect) {
                        onBack?.();
                      }
                    }
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    onClose?.();
                  }
                }
              }
              e.stopPropagation();
            }
          }}
          onMouseEnter={handleActivate}
        >
          <ScrollArea className="size-full min-h-0 **:data-[slot=scroll-area-scrollbar]:m-0 **:data-[slot=scroll-area-viewport]:h-full **:data-[slot=scroll-area-viewport]:overscroll-contain">
            {filteredOptions.length === 0 ? (
              <div className="py-2 text-center text-sm text-muted-foreground">
                {m['filters.noResultsFound']()}
              </div>
            ) : (
              <DropdownMenuGroup>
                {filteredOptions.map((option, index) => {
                  const isSelected = currentValues.includes(option.value);
                  const isHighlighted = highlightedIndex === index;
                  const itemId = `${baseId}-item-${index}`;

                  return (
                    <DropdownMenuCheckboxItem
                      key={String(option.value)}
                      aria-selected={isHighlighted}
                      checked={isSelected}
                      className={cn(
                        'data-highlighted:bg-accent data-highlighted:text-accent-foreground',
                        option.className,
                      )}
                      data-highlighted={isHighlighted ? true : undefined}
                      id={itemId}
                      role="option"
                      tabIndex={-1}
                      onCheckedChange={() => onToggle(option.value, isSelected)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onSelect={(e) => {
                        if (isMultiSelect) e.preventDefault();
                      }}
                    >
                      {renderIcon(option.icon)}
                      <span className="truncate">{option.label}</span>
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuGroup>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

export { SubmenuContent };
export type { SubmenuContentProps };
