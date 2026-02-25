import { createContext, use } from 'react';

type FilterContextValue = {
  allowMultiple?: boolean;
  className?: string;
  radius: 'default' | 'full';
  showSearchInput?: boolean;
  size: 'sm' | 'default' | 'lg';
  trigger?: React.ReactNode;
  variant: 'solid' | 'default';
};

const FilterContext = createContext<FilterContextValue>({
  allowMultiple: true,
  className: undefined,
  radius: 'default',
  showSearchInput: true,
  size: 'default',
  trigger: undefined,
  variant: 'default',
});

function useFilterContext() {
  return use(FilterContext);
}

export { FilterContext, useFilterContext };
export type { FilterContextValue };
