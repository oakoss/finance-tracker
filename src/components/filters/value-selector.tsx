import { useEffect, useId, useMemo, useRef, useState } from 'react';

import type {
  FilterFieldConfig,
  FilterOperatorValue,
} from '@/components/filters/types';

import { useFilterContext } from '@/components/filters/context';
import { renderIcon } from '@/components/filters/helpers';
import { FilterInput } from '@/components/filters/input';
import { Button } from '@/components/ui/button';
import { ButtonGroupText } from '@/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages';

type ValueSelectorProps<T = unknown> = {
  field: FilterFieldConfig<T>;
  onChange: (values: T[]) => void;
  operator: FilterOperatorValue;
  shouldFocus?: boolean | undefined;
  values: T[];
};

type SelectOptionsPopoverProps<T = unknown> = {
  field: FilterFieldConfig<T>;
  inline?: boolean;
  onChange: (values: T[]) => void;
  onClose?: () => void;
  values: T[];
};

function SelectOptionsPopover<T = unknown>({
  field,
  inline = false,
  onChange,
  onClose,
  values,
}: SelectOptionsPopoverProps<T>) {
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const context = useFilterContext();
  const baseId = useId();

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (highlightedIndex >= 0 && open) {
      const itemId = `${baseId}-item-${highlightedIndex}`;
      const element = document.querySelector<HTMLElement>(
        `#${CSS.escape(itemId)}`,
      );
      element?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, open, baseId]);

  const isMultiSelect = field.type === 'multiselect' || values.length > 1;
  const effectiveValues = field.value ?? values ?? [];

  const selectedOptions =
    field.options?.filter((opt) => effectiveValues.includes(opt.value)) ?? [];
  const unselectedOptions =
    field.options?.filter((opt) => !effectiveValues.includes(opt.value)) ?? [];

  const filteredSelectedOptions = selectedOptions;
  const filteredUnselectedOptions = unselectedOptions.filter((opt) =>
    opt.label.toLowerCase().includes(searchInput.toLowerCase()),
  );

  const allFilteredOptions = useMemo(
    () => [...filteredSelectedOptions, ...filteredUnselectedOptions],
    [filteredSelectedOptions, filteredUnselectedOptions],
  );

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  const renderMenuContent = () => (
    <>
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
              'border-input h-8 rounded-none border-0 bg-transparent! px-2 text-sm shadow-none',
              'focus-visible:border-border focus-visible:ring-0 focus-visible:ring-offset-0',
              open && 'placeholder:text-foreground',
            )}
            placeholder={m['filters.searchField']({
              fieldName: (field.label ?? '').toLowerCase(),
            })}
            role="combobox"
            value={searchInput}
            onBlur={() => open && inputRef.current?.focus()}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setHighlightedIndex(-1);
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              switch (e.key) {
                case 'ArrowDown': {
                  e.preventDefault();
                  if (allFilteredOptions.length > 0) {
                    setHighlightedIndex((prev) =>
                      prev < allFilteredOptions.length - 1 ? prev + 1 : 0,
                    );
                  }

                  break;
                }
                case 'ArrowUp': {
                  e.preventDefault();
                  if (allFilteredOptions.length > 0) {
                    setHighlightedIndex((prev) =>
                      prev > 0 ? prev - 1 : allFilteredOptions.length - 1,
                    );
                  }

                  break;
                }
                case 'ArrowLeft': {
                  e.preventDefault();
                  setOpen(false);

                  break;
                }
                default: {
                  if (e.key === 'Enter' && highlightedIndex >= 0) {
                    e.preventDefault();
                    const option = allFilteredOptions[highlightedIndex];
                    if (option) {
                      const isSelected = effectiveValues.includes(option.value);
                      const next = isSelected
                        ? effectiveValues.filter((v) => v !== option.value)
                        : isMultiSelect
                          ? ([...effectiveValues, option.value] as T[])
                          : ([option.value] as T[]);

                      if (
                        !isSelected &&
                        isMultiSelect &&
                        field.maxSelections &&
                        next.length > field.maxSelections
                      ) {
                        return;
                      }

                      if (field.onValueChange) {
                        field.onValueChange(next);
                      } else {
                        onChange(next);
                      }
                      if (!isMultiSelect) handleClose();
                    }
                  }
                }
              }
              e.stopPropagation();
            }}
          />
          <DropdownMenuSeparator />
        </>
      )}
      <div className="relative flex max-h-full">
        <div
          className="flex max-h-[min(var(--available-height),24rem)] w-full scroll-py-2 flex-col overscroll-contain"
          id={`${baseId}-listbox`}
          role="listbox"
        >
          <ScrollArea className="size-full min-h-0 **:data-[slot=scroll-area-scrollbar]:m-0 **:data-[slot=scroll-area-viewport]:h-full **:data-[slot=scroll-area-viewport]:overscroll-contain">
            {allFilteredOptions.length === 0 && (
              <div className="text-muted-foreground py-2 text-center text-sm">
                {m['filters.noResultsFound']()}
              </div>
            )}

            {filteredSelectedOptions.length > 0 && (
              <DropdownMenuGroup className="px-1">
                {filteredSelectedOptions.map((option, index) => {
                  const isHighlighted = highlightedIndex === index;
                  const itemId = `${baseId}-item-${index}`;

                  return (
                    <DropdownMenuCheckboxItem
                      key={String(option.value)}
                      aria-selected={isHighlighted}
                      checked={true}
                      className={cn(
                        'data-highlighted:bg-accent data-highlighted:text-accent-foreground',
                        option.className,
                      )}
                      data-highlighted={isHighlighted ? true : undefined}
                      id={itemId}
                      role="option"
                      onCheckedChange={() => {
                        const next = effectiveValues.filter(
                          (v) => v !== option.value,
                        );
                        if (field.onValueChange) {
                          field.onValueChange(next);
                        } else {
                          onChange(next);
                        }
                        if (!isMultiSelect) handleClose();
                      }}
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

            {filteredSelectedOptions.length > 0 &&
              filteredUnselectedOptions.length > 0 && (
                <DropdownMenuSeparator className="mx-0" />
              )}

            {filteredUnselectedOptions.length > 0 && (
              <DropdownMenuGroup className="px-1">
                {filteredUnselectedOptions.map((option, index) => {
                  const overallIndex = index + filteredSelectedOptions.length;
                  const isHighlighted = highlightedIndex === overallIndex;
                  const itemId = `${baseId}-item-${overallIndex}`;

                  return (
                    <DropdownMenuCheckboxItem
                      key={String(option.value)}
                      aria-selected={isHighlighted}
                      checked={false}
                      className={cn(
                        'data-highlighted:bg-accent data-highlighted:text-accent-foreground',
                        option.className,
                      )}
                      data-highlighted={isHighlighted ? true : undefined}
                      id={itemId}
                      role="option"
                      onCheckedChange={() => {
                        const next = isMultiSelect
                          ? ([...effectiveValues, option.value] as T[])
                          : ([option.value] as T[]);

                        if (
                          isMultiSelect &&
                          field.maxSelections &&
                          next.length > field.maxSelections
                        ) {
                          return;
                        }

                        if (field.onValueChange) {
                          field.onValueChange(next);
                        } else {
                          onChange(next);
                        }
                        if (!isMultiSelect) handleClose();
                      }}
                      onMouseEnter={() => setHighlightedIndex(overallIndex)}
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
    </>
  );

  if (inline) {
    return <div className="w-full">{renderMenuContent()}</div>;
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        setHighlightedIndex(-1);
        if (!open) {
          setTimeout(() => setSearchInput(''), 200);
        }
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button size={context.size} variant="outline">
            <div className="flex items-center gap-1.5">
              {field.customValueRenderer ? (
                field.customValueRenderer(values, field.options ?? [])
              ) : (
                <>
                  {selectedOptions.length > 0 && (
                    <div className="flex items-center -space-x-1.5">
                      {selectedOptions.slice(0, 3).map((option) => (
                        <div key={String(option.value)}>
                          {renderIcon(option.icon)}
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedOptions.length === 1
                    ? selectedOptions[0].label
                    : selectedOptions.length > 1
                      ? `${selectedOptions.length} ${m['filters.selectedCount']()}`
                      : m['filters.select']()}
                </>
              )}
            </div>
          </Button>
        }
      />
      <DropdownMenuContent
        align="start"
        className={cn('w-50 px-0', field.className)}
      >
        {renderMenuContent()}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ValueSelector<T = unknown>({
  field,
  onChange,
  operator,
  shouldFocus,
  values,
}: ValueSelectorProps<T>) {
  if (operator === 'empty' || operator === 'not_empty') {
    return null;
  }

  if (field.customRenderer) {
    return (
      <ButtonGroupText className="hover:bg-accent aria-expanded:bg-accent text-start whitespace-nowrap outline-hidden">
        {field.customRenderer({ field, onChange, operator, values })}
      </ButtonGroupText>
    );
  }

  if (field.type === 'text') {
    return (
      <FilterInput
        className={cn('w-36', field.className)}
        field={field}
        pattern={field.pattern}
        placeholder={field.placeholder}
        shouldFocus={shouldFocus}
        type="text"
        value={(values[0] as string) ?? ''}
        onChange={(e) => onChange([e.target.value] as T[])}
      />
    );
  }

  if (field.type === 'select' || field.type === 'multiselect') {
    return (
      <SelectOptionsPopover field={field} values={values} onChange={onChange} />
    );
  }

  return (
    <SelectOptionsPopover field={field} values={values} onChange={onChange} />
  );
}

export { SelectOptionsPopover, ValueSelector };
export type { SelectOptionsPopoverProps, ValueSelectorProps };
