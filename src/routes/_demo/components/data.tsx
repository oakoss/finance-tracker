import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';

import { Icons } from '@/components/icons';
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Stepper,
  StepperContent,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from '@/components/ui/timeline';
import { Section, Subsection } from '@/routes/_demo/components/shared';

export const Route = createFileRoute('/_demo/components/data')({
  component: DataPage,
});

const CHART_DATA = [
  { desktop: 186, mobile: 80, month: 'Jan' },
  { desktop: 305, mobile: 200, month: 'Feb' },
  { desktop: 237, mobile: 120, month: 'Mar' },
  { desktop: 73, mobile: 190, month: 'Apr' },
  { desktop: 209, mobile: 130, month: 'May' },
  { desktop: 214, mobile: 140, month: 'Jun' },
];

const CHART_CONFIG = {
  desktop: { color: 'var(--color-chart-1)', label: 'Desktop' },
  mobile: { color: 'var(--color-chart-2)', label: 'Mobile' },
} satisfies ChartConfig;

const TABLE_DATA = [
  { amount: '$250.00', category: 'Groceries', date: 'Mar 1', payee: 'Costco' },
  { amount: '$45.00', category: 'Dining', date: 'Mar 2', payee: 'Chipotle' },
  { amount: '$120.00', category: 'Utilities', date: 'Mar 3', payee: 'PG&E' },
  { amount: '$89.99', category: 'Shopping', date: 'Mar 4', payee: 'Amazon' },
  { amount: '$35.00', category: 'Transport', date: 'Mar 5', payee: 'Shell' },
];

function DataPage() {
  const [stepperValue, setStepperValue] = React.useState(2);

  return (
    <div className="space-y-10">
      <Section title="Table">
        <Subsection className="block" label="Default">
          <Table>
            <TableCaption>Recent transactions</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Payee</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TABLE_DATA.map((row) => (
                <TableRow key={row.date}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.payee}</TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell className="text-right">{row.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>Total</TableCell>
                <TableCell className="text-right">$539.99</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </Subsection>
      </Section>

      <Section title="Card">
        <Subsection className="block max-w-sm" label="Default">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Summary</CardTitle>
              <CardDescription>Your spending for March 2026</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">$2,450.00</p>
              <p className="text-muted-foreground text-xs">
                +12% from last month
              </p>
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="outline">
                View details
              </Button>
            </CardFooter>
          </Card>
        </Subsection>

        <Subsection className="block max-w-sm" label="With action">
          <Card>
            <CardHeader>
              <CardTitle>Budget</CardTitle>
              <CardDescription>Groceries category</CardDescription>
              <CardAction>
                <Button size="icon-sm" variant="ghost">
                  <Icons.MoreHorizontal />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">$320 / $500</p>
              <p className="text-muted-foreground text-xs">64% of budget</p>
            </CardContent>
          </Card>
        </Subsection>

        <Subsection className="block max-w-sm" label="Size sm">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Quick stat</CardTitle>
              <CardDescription>Accounts overview</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold">4 accounts</p>
            </CardContent>
          </Card>
        </Subsection>
      </Section>

      <Section title="Avatar">
        <Subsection label="Sizes">
          <Avatar size="sm">
            <AvatarFallback>SM</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>LG</AvatarFallback>
          </Avatar>
        </Subsection>

        <Subsection label="With image">
          <Avatar>
            <AvatarImage
              alt="User"
              src="https://api.dicebear.com/9.x/initials/svg?seed=JB"
            />
            <AvatarFallback>JB</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarImage
              alt="User"
              src="https://api.dicebear.com/9.x/initials/svg?seed=AK"
            />
            <AvatarFallback>AK</AvatarFallback>
          </Avatar>
        </Subsection>

        <Subsection label="With badge">
          <Avatar>
            <AvatarFallback>JB</AvatarFallback>
            <AvatarBadge />
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>AK</AvatarFallback>
            <AvatarBadge />
          </Avatar>
        </Subsection>

        <Subsection label="Group">
          <AvatarGroup>
            <Avatar>
              <AvatarFallback>JB</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>AK</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>MR</AvatarFallback>
            </Avatar>
            <AvatarGroupCount>+3</AvatarGroupCount>
          </AvatarGroup>
        </Subsection>
      </Section>

      <Section title="Skeleton">
        <Subsection className="block max-w-sm space-y-3" label="Default">
          <Skeleton className="h-32 w-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </Subsection>

        <Subsection className="block max-w-sm" label="Card placeholder">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </Subsection>
      </Section>

      <Section title="Tabs">
        <Subsection className="block max-w-md" label="Default">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <p className="text-muted-foreground p-2">
                Account overview content.
              </p>
            </TabsContent>
            <TabsContent value="transactions">
              <p className="text-muted-foreground p-2">
                Transaction list content.
              </p>
            </TabsContent>
            <TabsContent value="settings">
              <p className="text-muted-foreground p-2">
                Account settings content.
              </p>
            </TabsContent>
          </Tabs>
        </Subsection>

        <Subsection className="block max-w-md" label="Line variant">
          <Tabs defaultValue="spending">
            <TabsList variant="line">
              <TabsTrigger value="spending">Spending</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
              <TabsTrigger value="savings">Savings</TabsTrigger>
            </TabsList>
            <TabsContent value="spending">
              <p className="text-muted-foreground p-2">Spending breakdown.</p>
            </TabsContent>
            <TabsContent value="income">
              <p className="text-muted-foreground p-2">Income sources.</p>
            </TabsContent>
            <TabsContent value="savings">
              <p className="text-muted-foreground p-2">Savings progress.</p>
            </TabsContent>
          </Tabs>
        </Subsection>

        <Subsection className="block max-w-md" label="Vertical">
          <Tabs defaultValue="account" orientation="vertical">
            <TabsList>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>
            <TabsContent value="account">
              <p className="text-muted-foreground p-2">Account details.</p>
            </TabsContent>
            <TabsContent value="security">
              <p className="text-muted-foreground p-2">Security settings.</p>
            </TabsContent>
            <TabsContent value="billing">
              <p className="text-muted-foreground p-2">Billing info.</p>
            </TabsContent>
          </Tabs>
        </Subsection>
      </Section>

      <Section title="Timeline">
        <Subsection className="block" label="Vertical">
          <Timeline value={2}>
            <TimelineItem step={1}>
              <TimelineSeparator />
              <TimelineIndicator />
              <TimelineHeader>
                <TimelineDate>Feb 28</TimelineDate>
                <TimelineTitle>Account created</TimelineTitle>
              </TimelineHeader>
              <TimelineContent>Checking account opened.</TimelineContent>
            </TimelineItem>
            <TimelineItem step={2}>
              <TimelineSeparator />
              <TimelineIndicator />
              <TimelineHeader>
                <TimelineDate>Mar 1</TimelineDate>
                <TimelineTitle>First transaction</TimelineTitle>
              </TimelineHeader>
              <TimelineContent>Initial deposit of $1,000.</TimelineContent>
            </TimelineItem>
            <TimelineItem step={3}>
              <TimelineSeparator />
              <TimelineIndicator />
              <TimelineHeader>
                <TimelineDate>Mar 5</TimelineDate>
                <TimelineTitle>Budget set</TimelineTitle>
              </TimelineHeader>
              <TimelineContent>
                Monthly budget configured for 5 categories.
              </TimelineContent>
            </TimelineItem>
          </Timeline>
        </Subsection>
      </Section>

      <Section title="Stepper">
        <Subsection className="block" label="Horizontal">
          <Stepper
            indicators={{
              completed: <Icons.Check className="size-3" />,
            }}
            value={stepperValue}
            onValueChange={setStepperValue}
          >
            <StepperNav>
              <StepperItem step={1}>
                <StepperTrigger>
                  <StepperIndicator>1</StepperIndicator>
                  <div>
                    <StepperTitle>Account</StepperTitle>
                    <StepperDescription>Create account</StepperDescription>
                  </div>
                </StepperTrigger>
                <StepperSeparator />
              </StepperItem>
              <StepperItem step={2}>
                <StepperTrigger>
                  <StepperIndicator>2</StepperIndicator>
                  <div>
                    <StepperTitle>Categories</StepperTitle>
                    <StepperDescription>Set up categories</StepperDescription>
                  </div>
                </StepperTrigger>
                <StepperSeparator />
              </StepperItem>
              <StepperItem step={3}>
                <StepperTrigger>
                  <StepperIndicator>3</StepperIndicator>
                  <div>
                    <StepperTitle>Import</StepperTitle>
                    <StepperDescription>Import data</StepperDescription>
                  </div>
                </StepperTrigger>
              </StepperItem>
            </StepperNav>
            <StepperPanel>
              <StepperContent value={1}>
                <p className="text-muted-foreground p-4 text-sm">
                  Step 1: Create your first account.
                </p>
              </StepperContent>
              <StepperContent value={2}>
                <p className="text-muted-foreground p-4 text-sm">
                  Step 2: Configure spending categories.
                </p>
              </StepperContent>
              <StepperContent value={3}>
                <p className="text-muted-foreground p-4 text-sm">
                  Step 3: Import transactions from CSV.
                </p>
              </StepperContent>
            </StepperPanel>
            <div className="flex gap-2">
              <Button
                disabled={stepperValue <= 1}
                size="sm"
                variant="outline"
                onClick={() => setStepperValue(stepperValue - 1)}
              >
                Back
              </Button>
              <Button
                disabled={stepperValue >= 3}
                size="sm"
                onClick={() => setStepperValue(stepperValue + 1)}
              >
                Next
              </Button>
            </div>
          </Stepper>
        </Subsection>
      </Section>

      <Section title="Chart">
        <Subsection className="block max-w-lg" label="Bar chart">
          <ChartContainer config={CHART_CONFIG}>
            <BarChart accessibilityLayer data={CHART_DATA}>
              <CartesianGrid vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="month"
                tickLine={false}
                tickMargin={10}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
              <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
            </BarChart>
          </ChartContainer>
        </Subsection>
      </Section>
    </div>
  );
}
