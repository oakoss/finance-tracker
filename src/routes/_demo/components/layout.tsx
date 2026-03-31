import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { Icons } from '@/components/icons';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Badge } from '@/components/ui/badge';
import {
  Banner,
  BannerAction,
  BannerDescription,
  BannerDismiss,
  BannerTitle,
} from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import {
  ButtonGroup,
  ButtonGroupSeparator,
} from '@/components/ui/button-group';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { RouterLink } from '@/components/ui/link';
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from '@/components/ui/progress';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from '@/components/ui/sortable';
import { Spinner } from '@/components/ui/spinner';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Section, Subsection } from '@/routes/_demo/components/-shared';

export const Route = createFileRoute('/_demo/components/layout')({
  component: LayoutPage,
});

const BUTTON_VARIANTS = [
  'default',
  'secondary',
  'destructive',
  'outline',
  'ghost',
  'link',
] as const;

const BUTTON_SIZES = ['xs', 'sm', 'default', 'lg'] as const;

const BADGE_VARIANTS = [
  'default',
  'secondary',
  'destructive',
  'outline',
  'info',
  'success',
  'warning',
  'invert',
  'primary-light',
  'info-light',
  'success-light',
  'warning-light',
  'destructive-light',
] as const;

const BADGE_SIZES = ['xs', 'sm', 'default', 'lg', 'xl'] as const;

const ALERT_VARIANTS = [
  'default',
  'destructive',
  'info',
  'success',
  'warning',
  'invert',
] as const;

const BANNER_VARIANTS = ['info', 'success', 'warning', 'destructive'] as const;

const ASPECT_RATIOS = [
  { label: '16:9', maxWidth: 'max-w-xs', ratio: 16 / 9 },
  { label: '4:3', maxWidth: 'max-w-xs', ratio: 4 / 3 },
  { label: '1:1', maxWidth: 'max-w-50', ratio: 1 },
];

function LayoutPage() {
  return (
    <div className="space-y-10">
      <Section title="Button">
        <Subsection label="Variants">
          {BUTTON_VARIANTS.map((v) => (
            <Button key={v} variant={v}>
              {v}
            </Button>
          ))}
        </Subsection>

        <Subsection label="Sizes">
          {BUTTON_SIZES.map((s) => (
            <Button key={s} size={s}>
              {s}
            </Button>
          ))}
        </Subsection>

        <Subsection label="Icon sizes">
          {(['icon-xs', 'icon-sm', 'icon', 'icon-lg'] as const).map((s) => (
            <Button key={s} size={s} variant="outline">
              <Icons.Plus />
            </Button>
          ))}
        </Subsection>

        <Subsection label="With icon">
          <Button>
            <Icons.Plus data-icon="inline-start" />
            Add item
          </Button>
          <Button variant="outline">
            Settings
            <Icons.ChevronRight data-icon="inline-end" />
          </Button>
        </Subsection>

        <Subsection label="States">
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
        </Subsection>
      </Section>

      <Section title="ButtonGroup">
        <Subsection label="Horizontal">
          <ButtonGroup>
            <Button variant="outline">Left</Button>
            <Button variant="outline">Center</Button>
            <Button variant="outline">Right</Button>
          </ButtonGroup>
        </Subsection>

        <Subsection label="With separator">
          <ButtonGroup>
            <Button variant="outline">Save</Button>
            <ButtonGroupSeparator />
            <Button size="icon" variant="outline">
              <Icons.ChevronDown />
            </Button>
          </ButtonGroup>
        </Subsection>

        <Subsection label="Vertical">
          <ButtonGroup orientation="vertical">
            <Button variant="outline">Top</Button>
            <Button variant="outline">Middle</Button>
            <Button variant="outline">Bottom</Button>
          </ButtonGroup>
        </Subsection>
      </Section>

      <Section title="Badge">
        <Subsection label="Variants">
          {BADGE_VARIANTS.map((v) => (
            <Badge key={v} variant={v}>
              {v}
            </Badge>
          ))}
        </Subsection>

        <Subsection label="Sizes">
          {BADGE_SIZES.map((s) => (
            <Badge key={s} size={s}>
              {s}
            </Badge>
          ))}
        </Subsection>
      </Section>

      <Section title="Accordion">
        <Accordion className="max-w-md">
          <AccordionItem value="item-1">
            <AccordionTrigger>Is it accessible?</AccordionTrigger>
            <AccordionContent>
              Yes. It adheres to the WAI-ARIA design pattern.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Is it styled?</AccordionTrigger>
            <AccordionContent>
              Yes. It comes with default styles that match the other components.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>Is it animated?</AccordionTrigger>
            <AccordionContent>
              Yes. It uses CSS animations for smooth open/close transitions.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Section>

      <Section title="Collapsible">
        <Collapsible className="max-w-md space-y-2">
          <CollapsibleTrigger render={<Button size="sm" variant="outline" />}>
            Toggle content
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="rounded-md border p-3 text-sm">
              This content can be toggled open and closed.
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Section>

      <Section title="Alert">
        <div className="max-w-lg space-y-3">
          {ALERT_VARIANTS.map((v) => (
            <Alert key={v} variant={v}>
              <Icons.CircleAlert />
              <AlertTitle>{v}</AlertTitle>
              <AlertDescription>
                This is a {v} alert with a description.
              </AlertDescription>
            </Alert>
          ))}
        </div>
      </Section>

      <Section title="Banner">
        <div className="overflow-hidden rounded-lg border [&>*:last-child]:border-b-0">
          {BANNER_VARIANTS.map((v) => (
            <Banner key={v} variant={v}>
              <Icons.CircleAlert />
              <BannerTitle>{v} banner</BannerTitle>
              <BannerDescription>
                This is a {v} banner with a description.
              </BannerDescription>
              <BannerAction>
                <Button size="xs" variant="outline">
                  Action
                </Button>
              </BannerAction>
              <BannerDismiss />
            </Banner>
          ))}
        </div>
      </Section>

      <Section title="Progress">
        <div className="max-w-md space-y-4">
          <Progress value={25}>
            <ProgressLabel>Uploading</ProgressLabel>
            <ProgressValue />
          </Progress>
          <Progress value={60}>
            <ProgressLabel>Processing</ProgressLabel>
            <ProgressValue />
          </Progress>
          <Progress value={100}>
            <ProgressLabel>Complete</ProgressLabel>
            <ProgressValue />
          </Progress>
          <Progress value={null}>
            <ProgressLabel>Indeterminate</ProgressLabel>
          </Progress>
        </div>
      </Section>

      <Section title="Spinner">
        <Subsection label="Default">
          <Spinner />
        </Subsection>
        <Subsection label="Custom size">
          <Spinner className="size-6" />
          <Spinner className="size-8" />
        </Subsection>
      </Section>

      <Section title="Separator">
        <div className="max-w-md space-y-3">
          <p className="text-sm">Content above</p>
          <Separator />
          <p className="text-sm">Content below</p>
        </div>
        <div className="flex h-8 items-center gap-3">
          <span className="text-sm">Left</span>
          <Separator orientation="vertical" />
          <span className="text-sm">Right</span>
        </div>
      </Section>

      <Section title="ScrollArea">
        <ScrollArea className="h-40 max-w-md rounded-md border p-3">
          <div className="space-y-2">
            {Array.from({ length: 20 }, (_, i) => (
              <p key={i} className="text-sm">
                Scrollable item {i + 1}
              </p>
            ))}
          </div>
        </ScrollArea>
      </Section>

      <Section title="Kbd">
        <Subsection label="Single keys">
          <Kbd>Esc</Kbd>
          <Kbd>Tab</Kbd>
          <Kbd>Enter</Kbd>
          <Kbd>Space</Kbd>
        </Subsection>
        <Subsection label="Key group">
          <KbdGroup>
            <Kbd>
              <Icons.Command />
            </Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
          <KbdGroup>
            <Kbd>Ctrl</Kbd>
            <Kbd>Shift</Kbd>
            <Kbd>P</Kbd>
          </KbdGroup>
        </Subsection>
      </Section>

      <Section title="Toggle">
        <Subsection label="Default">
          <Toggle aria-label="Toggle bold">
            <Icons.Star />
          </Toggle>
          <Toggle aria-label="Toggle italic">
            <Icons.Circle />
          </Toggle>
          <Toggle aria-label="Toggle underline">
            <Icons.Check />
          </Toggle>
        </Subsection>

        <Subsection label="Outline variant">
          <Toggle aria-label="Toggle bold" variant="outline">
            <Icons.Star />
          </Toggle>
          <Toggle aria-label="Toggle italic" variant="outline">
            <Icons.Circle />
          </Toggle>
        </Subsection>

        <Subsection label="Sizes">
          <Toggle aria-label="Small" size="sm">
            <Icons.Star />
          </Toggle>
          <Toggle aria-label="Default">
            <Icons.Star />
          </Toggle>
          <Toggle aria-label="Large" size="lg">
            <Icons.Star />
          </Toggle>
        </Subsection>
      </Section>

      <Section title="ToggleGroup">
        <Subsection label="Default">
          <ToggleGroup defaultValue={['bold']}>
            <ToggleGroupItem value="bold">
              <Icons.Star />
            </ToggleGroupItem>
            <ToggleGroupItem value="italic">
              <Icons.Circle />
            </ToggleGroupItem>
            <ToggleGroupItem value="underline">
              <Icons.Check />
            </ToggleGroupItem>
          </ToggleGroup>
        </Subsection>

        <Subsection label="Outline variant">
          <ToggleGroup defaultValue={['center']} variant="outline">
            <ToggleGroupItem value="left">
              <Icons.ArrowLeft />
            </ToggleGroupItem>
            <ToggleGroupItem value="center">
              <Icons.ArrowUp />
            </ToggleGroupItem>
            <ToggleGroupItem value="right">
              <Icons.ArrowRight />
            </ToggleGroupItem>
          </ToggleGroup>
        </Subsection>

        <Subsection label="With spacing">
          <ToggleGroup defaultValue={['bold']} spacing={1}>
            <ToggleGroupItem value="bold">
              <Icons.Star />
            </ToggleGroupItem>
            <ToggleGroupItem value="italic">
              <Icons.Circle />
            </ToggleGroupItem>
            <ToggleGroupItem value="underline">
              <Icons.Check />
            </ToggleGroupItem>
          </ToggleGroup>
        </Subsection>
      </Section>

      <Section title="Resizable">
        <Subsection className="block" label="Horizontal">
          <ResizablePanelGroup
            className="max-w-lg rounded-lg border"
            orientation="horizontal"
          >
            <ResizablePanel defaultSize={50}>
              <div className="flex h-24 items-center justify-center text-sm">
                Panel A
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50}>
              <div className="flex h-24 items-center justify-center text-sm">
                Panel B
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </Subsection>

        <Subsection className="block" label="Vertical">
          <ResizablePanelGroup
            className="max-w-lg rounded-lg border"
            orientation="vertical"
          >
            <ResizablePanel defaultSize={50}>
              <div className="flex h-16 items-center justify-center text-sm">
                Top
              </div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={50}>
              <div className="flex h-16 items-center justify-center text-sm">
                Bottom
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </Subsection>
      </Section>

      <Section title="AspectRatio">
        {ASPECT_RATIOS.map(({ label, maxWidth, ratio }) => (
          <Subsection key={label} className={`block ${maxWidth}`} label={label}>
            <AspectRatio
              className="flex items-center justify-center rounded-lg bg-muted"
              ratio={ratio}
            >
              <span className="text-sm text-muted-foreground">{label}</span>
            </AspectRatio>
          </Subsection>
        ))}
      </Section>

      <Section title="Empty">
        <Subsection className="block max-w-md" label="Default">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="prominent">
                <Icons.Wallet />
              </EmptyMedia>
              <EmptyTitle>No transactions</EmptyTitle>
              <EmptyDescription>
                You have not added any transactions yet. Get started by creating
                your first one.
              </EmptyDescription>
            </EmptyHeader>
            <Button size="sm">
              <Icons.Plus data-icon="inline-start" />
              Add transaction
            </Button>
          </Empty>
        </Subsection>

        <Subsection
          className="block max-w-md"
          label="Size sm with icon variant"
        >
          <Empty size="sm">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Icons.Search />
              </EmptyMedia>
              <EmptyTitle>No results found</EmptyTitle>
              <EmptyDescription>
                Try adjusting your search or filter criteria.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Subsection>
      </Section>

      <SortableDemo />

      <Section title="RouterLink">
        <Subsection label="Variants">
          <RouterLink to="/components/layout">default</RouterLink>
          <RouterLink to="/components/layout" variant="muted">
            muted
          </RouterLink>
          <RouterLink to="/components/layout" variant="subtle">
            subtle
          </RouterLink>
          <RouterLink to="/components/layout" variant="nav">
            nav
          </RouterLink>
          <RouterLink to="/components/layout" variant="destructive">
            destructive
          </RouterLink>
        </Subsection>

        <Subsection label="External with icon">
          <RouterLink external showExternalIcon to="https://example.com">
            External link
          </RouterLink>
        </Subsection>

        <Subsection label="Sizes">
          <RouterLink size="sm" to="/components/layout">
            small
          </RouterLink>
          <RouterLink to="/components/layout">default</RouterLink>
          <RouterLink size="lg" to="/components/layout">
            large
          </RouterLink>
        </Subsection>
      </Section>
    </div>
  );
}

type SortableTask = { id: string; label: string };

const INITIAL_TASKS: SortableTask[] = [
  { id: '1', label: 'Review pull request' },
  { id: '2', label: 'Update documentation' },
  { id: '3', label: 'Fix failing tests' },
  { id: '4', label: 'Deploy to staging' },
];

function SortableDemo() {
  const [tasks, setTasks] = useState(INITIAL_TASKS);

  return (
    <Section title="Sortable">
      <Subsection className="block" label="Vertical list with drag handles">
        <Sortable
          className="max-w-md space-y-1"
          getItemValue={(item) => item.id}
          value={tasks}
          onValueChange={setTasks}
        >
          {tasks.map((task) => (
            <SortableItem
              key={task.id}
              className="flex items-center gap-2 rounded-md border bg-background px-3 py-2"
              value={task.id}
            >
              <SortableItemHandle className="text-muted-foreground">
                <Icons.GripVertical className="size-4" />
              </SortableItemHandle>
              <span className="text-sm">{task.label}</span>
            </SortableItem>
          ))}
        </Sortable>
      </Subsection>
    </Section>
  );
}
