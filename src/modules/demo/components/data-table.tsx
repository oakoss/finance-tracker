'use client';

import { type DragEndEvent, type UniqueIdentifier } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import {
  type ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table';
import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { toast } from 'sonner';

import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  DataGrid,
  DataGridContainer,
} from '@/components/ui/data-grid/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid/data-grid-column-header';
import { DataGridColumnVisibility } from '@/components/ui/data-grid/data-grid-column-visibility';
import { DataGridPagination } from '@/components/ui/data-grid/data-grid-pagination';
import {
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from '@/components/ui/data-grid/data-grid-table';
import {
  DataGridTableDndRowHandle,
  DataGridTableDndRows,
} from '@/components/ui/data-grid/data-grid-table-dnd-rows';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { type DataTableRow } from '@/modules/demo/data/data-table-schema';

const viewOptions = [
  { label: 'Outline', value: 'outline' },
  { label: 'Past Performance', value: 'past-performance' },
  { label: 'Key Personnel', value: 'key-personnel' },
  { label: 'Focus Documents', value: 'focus-documents' },
] as const;

type ViewValue = (typeof viewOptions)[number]['value'];
const defaultView: ViewValue = 'outline';

const reviewerOptions = [
  { label: 'Eddie Lake', value: 'Eddie Lake' },
  { label: 'Jamik Tashpulatov', value: 'Jamik Tashpulatov' },
] as const;

const reviewerSelectOptions = [
  ...reviewerOptions,
  { label: 'Emily Whalen', value: 'Emily Whalen' },
] as const;

const typeOptions = [
  { label: 'Cover Page', value: 'Cover Page' },
  { label: 'Table of Contents', value: 'Table of Contents' },
  { label: 'Narrative', value: 'Narrative' },
  { label: 'Technical Content', value: 'Technical Content' },
  { label: 'Plain Language', value: 'Plain Language' },
  { label: 'Legal', value: 'Legal' },
  { label: 'Visual', value: 'Visual' },
  { label: 'Financial', value: 'Financial' },
  { label: 'Research', value: 'Research' },
  { label: 'Planning', value: 'Planning' },
] as const;

const statusOptions = [
  { label: 'Done', value: 'Done' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Not Started', value: 'Not Started' },
] as const;

const gridLayout = {
  columnsResizable: true,
  columnsVisibility: true,
  headerSticky: true,
  rowBorder: true,
  rowsDraggable: true,
} as const;

const tableInputClassName =
  'hover:bg-input/30 focus-visible:bg-background dark:hover:bg-input/30 dark:focus-visible:bg-input/30 h-8 w-16 border-transparent bg-transparent text-right shadow-none focus-visible:border dark:bg-transparent';

type DataTableProps = {
  data: DataTableRow[];
};

type TableCellViewerProps = {
  item: DataTableRow;
};

function createSaveHandler(
  header: string,
): React.FormEventHandler<HTMLFormElement> {
  return (event) => {
    event.preventDefault();
    toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
      loading: `Saving ${header}`,
      success: `Saved ${header}`,
    });
  };
}

const columns: ColumnDef<DataTableRow>[] = [
  {
    cell: () => <DataGridTableDndRowHandle />,
    enableHiding: false,
    enableSorting: false,
    header: () => null,
    id: 'drag',
    size: 48,
  },
  {
    cell: ({ row }) => <DataGridTableRowSelect row={row} />,
    enableHiding: false,
    enableSorting: false,
    header: () => <DataGridTableRowSelectAll />,
    id: 'select',
    size: 48,
  },
  {
    accessorKey: 'header',
    cell: ({ row }) => <TableCellViewer item={row.original} />,
    enableHiding: false,
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Header" />
    ),
    meta: {
      headerTitle: 'Header',
    },
  },
  {
    accessorKey: 'type',
    cell: ({ row }) => (
      <div className="w-32">
        <Badge className="text-muted-foreground px-1.5" variant="outline">
          {row.original.type}
        </Badge>
      </div>
    ),
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Section Type" />
    ),
    meta: {
      headerTitle: 'Section Type',
    },
  },
  {
    accessorKey: 'status',
    cell: ({ row }) => (
      <Badge className="text-muted-foreground px-1.5" variant="outline">
        {row.original.status === 'Done' ? (
          <Icons.CircleCheck className="fill-green-500 dark:fill-green-400" />
        ) : (
          <Icons.Loader2 className="size-4" />
        )}
        {row.original.status}
      </Badge>
    ),
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Status" />
    ),
    meta: {
      headerTitle: 'Status',
    },
  },
  {
    accessorKey: 'target',
    cell: ({ row }) => (
      <form onSubmit={createSaveHandler(row.original.header)}>
        <Label className="sr-only" htmlFor={`${row.original.id}-target`}>
          Target
        </Label>
        <Input
          className={tableInputClassName}
          defaultValue={row.original.target}
          id={`${row.original.id}-target`}
        />
      </form>
    ),
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Target" />
    ),
    meta: {
      headerTitle: 'Target',
      headerClassName: 'text-right',
    },
  },
  {
    accessorKey: 'limit',
    cell: ({ row }) => (
      <form onSubmit={createSaveHandler(row.original.header)}>
        <Label className="sr-only" htmlFor={`${row.original.id}-limit`}>
          Limit
        </Label>
        <Input
          className={tableInputClassName}
          defaultValue={row.original.limit}
          id={`${row.original.id}-limit`}
        />
      </form>
    ),
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Limit" />
    ),
    meta: {
      headerTitle: 'Limit',
      headerClassName: 'text-right',
    },
  },
  {
    accessorKey: 'reviewer',
    cell: ({ row }) => {
      const isAssigned = row.original.reviewer !== 'Assign reviewer';
      if (isAssigned) {
        return row.original.reviewer;
      }
      return (
        <>
          <Label className="sr-only" htmlFor={`${row.original.id}-reviewer`}>
            Reviewer
          </Label>
          <Select items={reviewerOptions}>
            <SelectTrigger
              className="w-38 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
              id={`${row.original.id}-reviewer`}
              size="sm"
            >
              <SelectValue placeholder="Assign reviewer" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectGroup>
                {reviewerOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </>
      );
    },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Reviewer" />
    ),
    meta: {
      headerTitle: 'Reviewer',
    },
  },
  {
    id: 'actions',
    cell: () => (
      <Button
        className="text-muted-foreground flex size-8"
        size="icon"
        variant="ghost"
      >
        <Icons.EllipsisVertical />
        <span className="sr-only">Open menu</span>
      </Button>
    ),
    enableHiding: false,
    enableSorting: false,
    header: () => null,
    size: 56,
  },
];

export function DataTable({
  data: initialData,
}: DataTableProps): React.ReactElement {
  const [data, setData] = React.useState(() => initialData);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  const [view, setView] = React.useState<ViewValue>(defaultView);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data.map(({ id }) => id.toString()),
    [data],
  );

  const table = useReactTable({
    columns,
    data,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row: DataTableRow) => row.id.toString(),
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    state: {
      columnVisibility,
      pagination,
      rowSelection,
      sorting,
    },
  });

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    setData((current) => {
      const activeId = String(active.id);
      const overId = String(over.id);
      const oldIndex = current.findIndex(
        (item) => String(item.id) === activeId,
      );
      const newIndex = current.findIndex((item) => String(item.id) === overId);

      if (oldIndex === -1 || newIndex === -1) {
        return current;
      }

      return arrayMove(current, oldIndex, newIndex);
    });
  }

  return (
    <Tabs
      className="w-full flex-col justify-start gap-6"
      value={view}
      onValueChange={(value) => setView(value as ViewValue)}
    >
      <div className="flex items-center justify-between px-4 lg:px-6">
        <Label className="sr-only" htmlFor="view-selector">
          View
        </Label>
        <Select
          items={viewOptions}
          value={view}
          onValueChange={(value) => {
            if (value !== null) {
              setView(value);
            }
          }}
        >
          <SelectTrigger
            className="flex w-fit @4xl/main:hidden"
            id="view-selector"
            size="sm"
          >
            <SelectValue placeholder="Select a view" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {viewOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
          <TabsTrigger value="outline">Outline</TabsTrigger>
          <TabsTrigger value="past-performance">
            Past Performance <Badge variant="secondary">3</Badge>
          </TabsTrigger>
          <TabsTrigger value="key-personnel">
            Key Personnel <Badge variant="secondary">2</Badge>
          </TabsTrigger>
          <TabsTrigger value="focus-documents">Focus Documents</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <DataGridColumnVisibility
            table={table}
            trigger={
              <Button size="sm" variant="outline">
                <Icons.Columns3 data-icon="inline-start" />
                Columns
                <Icons.ChevronDown data-icon="inline-end" />
              </Button>
            }
          />
          <Button size="sm" variant="outline">
            <Icons.Plus />
            <span className="hidden lg:inline">Add Section</span>
          </Button>
        </div>
      </div>
      <TabsContent
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
        value="outline"
      >
        <DataGrid
          recordCount={data.length}
          table={table}
          tableLayout={gridLayout}
        >
          <DataGridContainer className="rounded-lg">
            <DataGridTableDndRows
              dataIds={dataIds}
              handleDragEnd={handleDragEnd}
            />
          </DataGridContainer>
          <div className="flex items-center justify-between px-4">
            <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
              {table.getSelectedRowModel().rows.length} of{' '}
              {table.getRowModel().rows.length} row(s) selected.
            </div>
            <div className="flex w-full items-center justify-end lg:w-fit">
              <DataGridPagination />
            </div>
          </div>
        </DataGrid>
      </TabsContent>
      <TabsContent
        className="flex flex-col px-4 lg:px-6"
        value="past-performance"
      >
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
      <TabsContent className="flex flex-col px-4 lg:px-6" value="key-personnel">
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
      <TabsContent
        className="flex flex-col px-4 lg:px-6"
        value="focus-documents"
      >
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
    </Tabs>
  );
}

const chartData = [
  {
    desktop: 186,
    mobile: 80,
    month: 'January',
  },
  {
    desktop: 305,
    mobile: 200,
    month: 'February',
  },
  {
    desktop: 237,
    mobile: 120,
    month: 'March',
  },
  {
    desktop: 73,
    mobile: 190,
    month: 'April',
  },
  {
    desktop: 209,
    mobile: 130,
    month: 'May',
  },
  {
    desktop: 214,
    mobile: 140,
    month: 'June',
  },
];

const chartConfig = {
  desktop: {
    label: 'Desktop',
    color: 'var(--primary)',
  },
  mobile: {
    label: 'Mobile',
    color: 'var(--primary)',
  },
} satisfies ChartConfig;

function TableCellViewer({ item }: TableCellViewerProps): React.ReactElement {
  const isMobile = useIsMobile();
  const headerId = `${item.id}-header`;
  const typeId = `${item.id}-type`;
  const statusId = `${item.id}-status`;
  const targetId = `${item.id}-target`;
  const limitId = `${item.id}-limit`;
  const reviewerId = `${item.id}-reviewer`;
  return (
    <Drawer direction={isMobile ? 'bottom' : 'right'}>
      <DrawerTrigger
        render={
          <Button
            className="text-foreground w-fit px-0 text-left"
            variant="link"
          >
            {item.header}
          </Button>
        }
      />
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.header}</DrawerTitle>
          <DrawerDescription>
            Showing total visitors for the last 6 months
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          {!isMobile && (
            <>
              <ChartContainer config={chartConfig}>
                <AreaChart
                  accessibilityLayer
                  data={chartData}
                  margin={{
                    left: 0,
                    right: 10,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    hide
                    axisLine={false}
                    dataKey="month"
                    tickFormatter={(value) => value.slice(0, 3)}
                    tickLine={false}
                    tickMargin={8}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent indicator="dot" />}
                    cursor={false}
                  />
                  <Area
                    dataKey="mobile"
                    fill="var(--color-mobile)"
                    fillOpacity={0.6}
                    stackId="a"
                    stroke="var(--color-mobile)"
                    type="natural"
                  />
                  <Area
                    dataKey="desktop"
                    fill="var(--color-desktop)"
                    fillOpacity={0.4}
                    stackId="a"
                    stroke="var(--color-desktop)"
                    type="natural"
                  />
                </AreaChart>
              </ChartContainer>
              <Separator />
              <div className="grid gap-2">
                <div className="flex gap-2 leading-none font-medium">
                  Trending up by 5.2% this month{' '}
                  <Icons.TrendingUp className="size-4" />
                </div>
                <div className="text-muted-foreground">
                  Showing total visitors for the last 6 months. This is just
                  some random text to test the layout. It spans multiple lines
                  and should wrap around.
                </div>
              </div>
              <Separator />
            </>
          )}
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor={headerId}>Header</Label>
              <Input defaultValue={item.header} id={headerId} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor={typeId}>Type</Label>
                <Select defaultValue={item.type} items={typeOptions}>
                  <SelectTrigger className="w-full" id={typeId}>
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {typeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor={statusId}>Status</Label>
                <Select defaultValue={item.status} items={statusOptions}>
                  <SelectTrigger className="w-full" id={statusId}>
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor={targetId}>Target</Label>
                <Input defaultValue={item.target} id={targetId} />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor={limitId}>Limit</Label>
                <Input defaultValue={item.limit} id={limitId} />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor={reviewerId}>Reviewer</Label>
              <Select
                defaultValue={item.reviewer}
                items={reviewerSelectOptions}
              >
                <SelectTrigger className="w-full" id={reviewerId}>
                  <SelectValue placeholder="Select a reviewer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {reviewerSelectOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </form>
        </div>
        <DrawerFooter>
          <Button>Submit</Button>
          <DrawerClose render={<Button variant="outline">Close</Button>} />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
