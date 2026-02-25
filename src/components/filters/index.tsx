import { useRender } from '@base-ui/react/use-render';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { filtersContainerVariants } from '@/components/filters/content';
import { FilterContext } from '@/components/filters/context';
import {
  createFilter,
  flattenFields,
  getFieldsMap,
  renderIcon,
} from '@/components/filters/helpers';
import { OperatorDropdown } from '@/components/filters/operators';
import { RemoveButton } from '@/components/filters/remove-button';
import { SubmenuContent } from '@/components/filters/submenu';
import type { Filter, FilterFieldsConfig } from '@/components/filters/types';
import { ValueSelector } from '@/components/filters/value-selector';
import { ButtonGroup, ButtonGroupText } from '@/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages';

type FiltersProps<T = unknown> = {
  allowMultiple?: boolean;
  className?: string;
  collapseAddButton?: boolean;
  enableShortcut?: boolean;
  fields: FilterFieldsConfig<T>;
  filters: Filter<T>[];
  menuPopupClassName?: string;
  onChange: (filters: Filter<T>[]) => void;
  radius?: 'default' | 'full';
  shortcutKey?: string;
  shortcutLabel?: string;
  showSearchInput?: boolean;
  size?: 'sm' | 'default' | 'lg';
  trigger?: React.ReactNode;
  variant?: 'solid' | 'default';
};

function Filters<T = unknown>({
  filters,
  fields,
  onChange,
  className,
  variant = 'default',
  size = 'default',
  radius = 'default',
  showSearchInput = true,
  trigger,
  allowMultiple = true,
  menuPopupClassName,
  enableShortcut = false,
  shortcutKey = 'f',
  shortcutLabel = 'F',
}: FiltersProps<T>) {
  const [addFilterOpen, setAddFilterOpen] = useState(false);
  const [menuSearchInput, setMenuSearchInput] = useState('');
  const [activeMenu, setActiveMenu] = useState<string>('root');
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [lastAddedFilterId, setLastAddedFilterId] = useState<string | null>(
    null,
  );
  const rootInputRef = useRef<HTMLInputElement>(null);
  const rootId = useId();

  useEffect(() => {
    if (!enableShortcut) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === shortcutKey.toLowerCase() &&
        !addFilterOpen &&
        !(
          document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement
        )
      ) {
        e.preventDefault();
        setAddFilterOpen(true);
      }
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [enableShortcut, shortcutKey, addFilterOpen]);

  useEffect(() => {
    if (addFilterOpen && activeMenu === 'root') {
      rootInputRef.current?.focus();
    }
  }, [addFilterOpen, activeMenu]);

  useEffect(() => {
    if (highlightedIndex >= 0 && addFilterOpen) {
      const itemId = `${rootId}-item-${highlightedIndex}`;
      const element = document.querySelector<HTMLElement>(
        `#${CSS.escape(itemId)}`,
      );
      element?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, addFilterOpen, rootId]);

  const [sessionFilterIds, setSessionFilterIds] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (lastAddedFilterId) {
      const timer = setTimeout(() => {
        setLastAddedFilterId(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [lastAddedFilterId]);

  const fieldsMap = useMemo(() => getFieldsMap(fields), [fields]);

  const updateFilter = useCallback(
    (filterId: string, updates: Partial<Filter<T>>) => {
      onChange(
        filters.map((filter) => {
          if (filter.id === filterId) {
            const updatedFilter = { ...filter, ...updates };
            if (
              updates.operator === 'empty' ||
              updates.operator === 'not_empty'
            ) {
              updatedFilter.values = [] as T[];
            }
            return updatedFilter;
          }
          return filter;
        }),
      );
    },
    [filters, onChange],
  );

  const removeFilter = useCallback(
    (filterId: string) => {
      onChange(filters.filter((filter) => filter.id !== filterId));
    },
    [filters, onChange],
  );

  const addFilter = useCallback(
    (fieldKey: string) => {
      const field = fieldsMap[fieldKey];
      if (field?.key) {
        const defaultOperator =
          field.defaultOperator ??
          (field.type === 'multiselect' ? 'is_any_of' : 'is');
        const defaultValues: unknown[] = field.type === 'text' ? [''] : [];
        const newFilter = createFilter<T>(
          fieldKey,
          defaultOperator,
          defaultValues as T[],
        );
        setLastAddedFilterId(newFilter.id);
        onChange([...filters, newFilter]);
        setAddFilterOpen(false);
        setMenuSearchInput('');
      }
    },
    [fieldsMap, filters, onChange],
  );

  useEffect(() => {
    if (addFilterOpen && activeMenu === 'root') {
      rootInputRef.current?.focus();
    }
  }, [addFilterOpen, activeMenu]);

  const selectableFields = useMemo(() => {
    const flatFields = flattenFields(fields);
    return flatFields.filter((field) => {
      if (!field.key || field.type === 'separator') return false;
      if (allowMultiple) return true;
      return !filters.some((filter) => filter.field === field.key);
    });
  }, [fields, filters, allowMultiple]);

  const filteredFields = useMemo(() => {
    return selectableFields.filter(
      (f) =>
        !menuSearchInput ||
        f.label?.toLowerCase().includes(menuSearchInput.toLowerCase()),
    );
  }, [selectableFields, menuSearchInput]);

  const triggerButton = useRender({
    defaultTagName: 'button',
    render: trigger as React.ReactElement,
  });

  return (
    <FilterContext.Provider
      value={{
        allowMultiple,
        className,
        radius,
        size,
        trigger,
        variant,
      }}
    >
      <div
        className={cn(filtersContainerVariants({ size, variant }), className)}
      >
        {selectableFields.length > 0 && (
          <DropdownMenu
            open={addFilterOpen}
            onOpenChange={(open) => {
              setAddFilterOpen(open);
              if (open) {
                setActiveMenu('root');
                setHighlightedIndex(
                  filteredFields.length > 0 ? 0 : highlightedIndex,
                );
              } else {
                setMenuSearchInput('');
                setSessionFilterIds({});
                setOpenSubMenu(null);
                setHighlightedIndex(-1);
              }
            }}
          >
            <DropdownMenuTrigger render={triggerButton} />
            <DropdownMenuContent
              align="start"
              className={cn('w-55', menuPopupClassName)}
            >
              {showSearchInput && (
                <>
                  <div className="relative">
                    <Input
                      ref={rootInputRef}
                      aria-activedescendant={
                        highlightedIndex >= 0
                          ? `${rootId}-item-${highlightedIndex}`
                          : undefined
                      }
                      aria-controls={`${rootId}-listbox`}
                      aria-expanded={addFilterOpen}
                      className={cn(
                        'h-8 rounded-none border-0 bg-transparent! px-2 text-sm shadow-none',
                        'focus-visible:border-border focus-visible:ring-0 focus-visible:ring-offset-0',
                        activeMenu === 'root' && 'placeholder:text-foreground',
                      )}
                      placeholder={m['filters.search']()}
                      role="combobox"
                      value={menuSearchInput}
                      onBlur={() =>
                        activeMenu === 'root' && rootInputRef.current?.focus()
                      }
                      onChange={(e) => {
                        setMenuSearchInput(e.target.value);
                        setHighlightedIndex(-1);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onFocus={() => setActiveMenu('root')}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          if (filteredFields.length > 0) {
                            setHighlightedIndex((prev) =>
                              prev < filteredFields.length - 1 ? prev + 1 : 0,
                            );
                          }
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          if (filteredFields.length > 0) {
                            setHighlightedIndex((prev) =>
                              prev > 0 ? prev - 1 : filteredFields.length - 1,
                            );
                          }
                        } else if (
                          (e.key === 'ArrowRight' || e.key === 'ArrowLeft') &&
                          highlightedIndex >= 0
                        ) {
                          const field = filteredFields[highlightedIndex];
                          const hasSubMenu =
                            field &&
                            (field.type === 'select' ||
                              field.type === 'multiselect') &&
                            field.options?.length;

                          if (e.key === 'ArrowRight' && hasSubMenu) {
                            e.preventDefault();
                            setOpenSubMenu(field.key ?? null);
                            setActiveMenu(field.key ?? 'root');
                          } else if (e.key === 'ArrowLeft') {
                            e.preventDefault();
                            if (openSubMenu) {
                              setOpenSubMenu(null);
                              setActiveMenu('root');
                            }
                          }
                        } else if (e.key === 'Enter' && highlightedIndex >= 0) {
                          e.preventDefault();
                          const field = filteredFields[highlightedIndex];
                          if (field.key) {
                            const hasSubMenu =
                              (field.type === 'select' ||
                                field.type === 'multiselect') &&
                              field.options?.length;
                            if (hasSubMenu) {
                              if (openSubMenu === field.key) {
                                setOpenSubMenu(null);
                                setActiveMenu('root');
                              } else {
                                setOpenSubMenu(field.key);
                                setActiveMenu(field.key);
                              }
                            } else {
                              addFilter(field.key);
                            }
                          }
                        } else if (e.key === 'Escape') {
                          setAddFilterOpen(false);
                        }
                        e.stopPropagation();
                      }}
                      onMouseEnter={() => setActiveMenu('root')}
                    />
                    {enableShortcut && shortcutLabel && (
                      <Kbd className="bg-background absolute top-1/2 right-2 -translate-y-1/2 border">
                        {shortcutLabel}
                      </Kbd>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}

              <div className="relative flex max-h-full">
                <div
                  className="flex max-h-[min(var(--available-height),24rem)] w-full scroll-py-2 flex-col overscroll-contain"
                  id={`${rootId}-listbox`}
                  role="listbox"
                  tabIndex={0}
                  onMouseEnter={() => setActiveMenu('root')}
                >
                  <ScrollArea className="**:data-[slot=scroll-area-scrollbar]:m-0">
                    {(() => {
                      if (filteredFields.length === 0) {
                        return (
                          <div className="text-muted-foreground py-2 text-center text-sm">
                            {m['filters.noFieldsFound']()}
                          </div>
                        );
                      }

                      return filteredFields.map((field, index) => {
                        const isHighlighted = highlightedIndex === index;
                        const itemId = `${rootId}-item-${index}`;
                        const hasSubMenu =
                          (field.type === 'select' ||
                            field.type === 'multiselect') &&
                          field.options?.length;

                        if (hasSubMenu) {
                          const isMultiSelect = field.type === 'multiselect';
                          const fieldKey = field.key!;
                          const sessionFilterId = sessionFilterIds[fieldKey];
                          const sessionFilter = sessionFilterId
                            ? filters.find((f) => f.id === sessionFilterId)
                            : null;
                          const currentValues = sessionFilter?.values ?? [];

                          return (
                            <DropdownMenuSub
                              key={fieldKey}
                              open={openSubMenu === fieldKey}
                              onOpenChange={(open) => {
                                if (open) {
                                  setOpenSubMenu(fieldKey);
                                } else {
                                  if (openSubMenu === fieldKey) {
                                    setOpenSubMenu(null);
                                    setActiveMenu('root');
                                  }
                                }
                              }}
                            >
                              <DropdownMenuSubTrigger
                                aria-selected={isHighlighted}
                                className="data-popup-open:bg-accent data-popup-open:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                                data-highlighted={
                                  isHighlighted ? true : undefined
                                }
                                id={itemId}
                                role="option"
                                onMouseEnter={() => {
                                  setHighlightedIndex(index);
                                  setActiveMenu('root');
                                }}
                              >
                                {renderIcon(field.icon)}
                                <span>{field.label}</span>
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent
                                className="w-50"
                                side="right"
                              >
                                <SubmenuContent
                                  currentValues={currentValues}
                                  field={field}
                                  isActive={activeMenu === fieldKey}
                                  isMultiSelect={isMultiSelect}
                                  onActive={() => {
                                    if (field.searchable !== false) {
                                      setActiveMenu(fieldKey);
                                    }
                                  }}
                                  onBack={() => {
                                    setOpenSubMenu(null);
                                    setActiveMenu('root');
                                  }}
                                  onClose={() => setAddFilterOpen(false)}
                                  onToggle={(value, isSelected) => {
                                    if (isMultiSelect) {
                                      const nextValues = isSelected
                                        ? currentValues.filter(
                                            (v) => v !== value,
                                          )
                                        : ([...currentValues, value] as T[]);

                                      if (sessionFilter) {
                                        if (nextValues.length === 0) {
                                          onChange(
                                            filters.filter(
                                              (f) => f.id !== sessionFilter.id,
                                            ),
                                          );
                                          setSessionFilterIds((prev) => ({
                                            ...prev,
                                            [fieldKey]: '',
                                          }));
                                        } else {
                                          onChange(
                                            filters.map((f) =>
                                              f.id === sessionFilter.id
                                                ? { ...f, values: nextValues }
                                                : f,
                                            ),
                                          );
                                        }
                                      } else {
                                        const newFilter = createFilter<T>(
                                          fieldKey,
                                          field.defaultOperator ?? 'is_any_of',
                                          nextValues,
                                        );
                                        onChange([...filters, newFilter]);
                                        setSessionFilterIds((prev) => ({
                                          ...prev,
                                          [fieldKey]: newFilter.id,
                                        }));
                                      }
                                    } else {
                                      const newFilter = createFilter<T>(
                                        fieldKey,
                                        field.defaultOperator ?? 'is',
                                        [value] as T[],
                                      );
                                      setLastAddedFilterId(newFilter.id);
                                      onChange([...filters, newFilter]);
                                      setAddFilterOpen(false);
                                    }
                                  }}
                                />
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          );
                        }

                        return (
                          <DropdownMenuItem
                            key={field.key}
                            aria-selected={isHighlighted}
                            className="data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                            data-highlighted={isHighlighted ? true : undefined}
                            id={itemId}
                            role="option"
                            onClick={() => field.key && addFilter(field.key)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                          >
                            {renderIcon(field.icon)}
                            <span>{field.label}</span>
                          </DropdownMenuItem>
                        );
                      });
                    })()}
                  </ScrollArea>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {filters.map((filter) => {
          const field = fieldsMap[filter.field];
          if (!field) return null;
          return (
            <ButtonGroup key={filter.id}>
              <ButtonGroupText className="">
                {renderIcon(field.icon)}
                {field.label}
              </ButtonGroupText>
              <OperatorDropdown<T>
                field={field}
                operator={filter.operator}
                values={filter.values}
                onChange={(operator) => updateFilter(filter.id, { operator })}
              />
              <ValueSelector<T>
                field={field}
                operator={filter.operator}
                shouldFocus={filter.id === lastAddedFilterId}
                values={filter.values}
                onChange={(values) => updateFilter(filter.id, { values })}
              />
              <RemoveButton onClick={() => removeFilter(filter.id)} />
            </ButtonGroup>
          );
        })}
      </div>
    </FilterContext.Provider>
  );
}

export { Filters };

export { FiltersContent } from '@/components/filters/content';
