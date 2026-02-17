'use client';

import React, { type ReactNode } from 'react';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useDataGrid } from '@/components/ui/data-grid/data-grid';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type DataGridPaginationProps = {
  sizes?: number[];
  sizesInfo?: string;
  sizesLabel?: string;
  sizesDescription?: string;
  sizesSkeleton?: ReactNode;
  more?: boolean;
  moreLimit?: number;
  info?: string;
  infoSkeleton?: ReactNode;
  className?: string;
  rowsPerPageLabel?: string;
  previousPageLabel?: string;
  nextPageLabel?: string;
  ellipsisText?: string;
};

function DataGridPagination(props: DataGridPaginationProps): React.JSX.Element {
  const { table, recordCount, isLoading } = useDataGrid();

  const defaultProps: Partial<DataGridPaginationProps> = {
    ellipsisText: '...',
    info: '{from} - {to} of {count}',
    infoSkeleton: <Skeleton className="h-8 w-60" />,
    more: false,
    moreLimit: 5,
    nextPageLabel: 'Go to next page',
    previousPageLabel: 'Go to previous page',
    rowsPerPageLabel: 'Rows per page',
    sizes: [5, 10, 25, 50, 100],
    sizesDescription: 'per page',
    sizesLabel: 'Show',
    sizesSkeleton: <Skeleton className="h-8 w-44" />,
  };

  const mergedProps: DataGridPaginationProps = { ...defaultProps, ...props };

  const btnBaseClasses = 'size-7 p-0 text-sm';
  const btnArrowClasses = btnBaseClasses + ' rtl:transform rtl:rotate-180';
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const from = pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, recordCount);
  const pageCount = table.getPageCount();

  // Replace placeholders in paginationInfo
  const paginationInfo = mergedProps?.info
    ? mergedProps.info
        .replace('{from}', from.toString())
        .replace('{to}', to.toString())
        .replace('{count}', recordCount.toString())
    : `${from} - ${to} of ${recordCount}`;

  // Pagination limit logic
  const paginationMoreLimit = mergedProps?.moreLimit ?? 5;

  // Determine the start and end of the pagination group
  const currentGroupStart =
    Math.floor(pageIndex / paginationMoreLimit) * paginationMoreLimit;
  const currentGroupEnd = Math.min(
    currentGroupStart + paginationMoreLimit,
    pageCount,
  );

  // Render page buttons based on the current group
  const renderPageButtons = () => {
    const buttons = [];
    for (let i = currentGroupStart; i < currentGroupEnd; i++) {
      buttons.push(
        <Button
          key={i}
          className={cn(btnBaseClasses, 'text-muted-foreground', {
            'bg-accent text-accent-foreground': pageIndex === i,
          })}
          size="icon-sm"
          variant="ghost"
          onClick={() => {
            if (pageIndex !== i) {
              table.setPageIndex(i);
            }
          }}
        >
          {i + 1}
        </Button>,
      );
    }
    return buttons;
  };

  // Render a "previous" ellipsis button if there are previous pages to show
  const renderEllipsisPrevButton = () => {
    if (currentGroupStart > 0) {
      return (
        <Button
          className={btnBaseClasses}
          size="icon-sm"
          variant="ghost"
          onClick={() => table.setPageIndex(currentGroupStart - 1)}
        >
          {mergedProps.ellipsisText}
        </Button>
      );
    }
    return null;
  };

  // Render a "next" ellipsis button if there are more pages to show after the current group
  const renderEllipsisNextButton = () => {
    if (currentGroupEnd < pageCount) {
      return (
        <Button
          className={btnBaseClasses}
          size="icon-sm"
          variant="ghost"
          onClick={() => table.setPageIndex(currentGroupEnd)}
        >
          {mergedProps.ellipsisText}
        </Button>
      );
    }
    return null;
  };

  return (
    <div
      className={cn(
        'flex grow flex-col flex-wrap items-center justify-between gap-2.5 py-2.5 sm:flex-row sm:py-0',
        mergedProps?.className,
      )}
      data-slot="data-grid-pagination"
    >
      <div className="order-2 flex flex-wrap items-center space-x-2.5 pb-2.5 sm:order-1 sm:pb-0">
        {isLoading ? (
          mergedProps?.sizesSkeleton
        ) : (
          <>
            <div className="text-muted-foreground text-sm">
              {mergedProps.rowsPerPageLabel}
            </div>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => {
                const newPageSize = Number(value);
                table.setPageSize(newPageSize);
              }}
            >
              <SelectTrigger className="w-14" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-18" side="top">
                {mergedProps?.sizes?.map((size: number) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>
      <div className="order-1 flex flex-col items-center justify-center gap-2.5 pt-2.5 sm:order-2 sm:flex-row sm:justify-end sm:pt-0">
        {isLoading ? (
          mergedProps?.infoSkeleton
        ) : (
          <>
            <div className="text-muted-foreground text-sm order-2 text-nowrap sm:order-1">
              {paginationInfo}
            </div>
            {pageCount > 1 && (
              <div className="order-1 flex items-center space-x-1 sm:order-2">
                <Button
                  className={btnArrowClasses}
                  disabled={!table.getCanPreviousPage()}
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => table.previousPage()}
                >
                  <span className="sr-only">
                    {mergedProps.previousPageLabel}
                  </span>
                  <Icons.ChevronLeft className="size-4" />
                </Button>

                {renderEllipsisPrevButton()}

                {renderPageButtons()}

                {renderEllipsisNextButton()}

                <Button
                  className={btnArrowClasses}
                  disabled={!table.getCanNextPage()}
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => table.nextPage()}
                >
                  <span className="sr-only">{mergedProps.nextPageLabel}</span>
                  <Icons.ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export { DataGridPagination, type DataGridPaginationProps };
