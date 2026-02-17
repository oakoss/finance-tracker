import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  chartConfig,
  chartData,
} from '@/modules/demo/data/chart-area-interactive-data';

export const description = 'An interactive area chart';

const defaultRange = '90d';

const rangeOptions = [
  { label: 'Last 3 months', value: '90d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 7 days', value: '7d' },
] as const;

const referenceDate = new Date('2024-06-30');

function getDaysToSubtract(value: string): number {
  switch (value) {
    case '30d': {
      return 30;
    }
    case '7d': {
      return 7;
    }
    default: {
      return 90;
    }
  }
}

function formatChartDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function ChartAreaInteractive(): React.ReactElement {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState(defaultRange);

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange('7d');
    }
  }, [isMobile]);

  const filteredData = React.useMemo(() => {
    const daysToSubtract = getDaysToSubtract(timeRange);
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    return chartData.filter((item) => new Date(item.date) >= startDate);
  }, [timeRange]);

  function handleToggleChange(value: string[]): void {
    setTimeRange(value[0] ?? defaultRange);
  }

  function handleRangeSelect(value: string | null): void {
    if (value !== null) {
      setTimeRange(value);
    }
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Total Visitors</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Total for the last 3 months
          </span>
          <span className="@[540px]/card:hidden">Last 3 months</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
            multiple={false}
            value={timeRange ? [timeRange] : []}
            variant="outline"
            onValueChange={handleToggleChange}
          >
            {rangeOptions.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Select value={timeRange} onValueChange={handleRangeSelect}>
            <SelectTrigger
              aria-label="Select a value"
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
            >
              <SelectValue placeholder={rangeOptions[0].label} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {rangeOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  className="rounded-lg"
                  value={option.value}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          className="aspect-auto h-62.5 w-full"
          config={chartConfig}
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillDesktop" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={1}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillMobile" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="date"
              minTickGap={32}
              tickFormatter={formatChartDate}
              tickLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={formatChartDate}
                />
              }
              cursor={false}
            />
            <Area
              dataKey="mobile"
              fill="url(#fillMobile)"
              stackId="a"
              stroke="var(--color-mobile)"
              type="natural"
            />
            <Area
              dataKey="desktop"
              fill="url(#fillDesktop)"
              stackId="a"
              stroke="var(--color-desktop)"
              type="natural"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
