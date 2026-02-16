import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentPropsWithoutRef, ElementType } from 'react';

import { cn } from '@/lib/utils';

const typographyVariants = cva('', {
  variants: {
    variant: {
      blockquote: 'mt-6 border-l-2 pl-6 italic',
      h1: 'scroll-m-20 text-4xl font-extrabold tracking-tight text-balance',
      h2: 'mt-10 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0',
      h3: 'mt-8 scroll-m-20 text-2xl font-semibold tracking-tight',
      h4: 'scroll-m-20 text-xl font-semibold tracking-tight',
      inlineCode:
        'bg-muted relative rounded-sm px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
      large: 'text-lg font-semibold',
      lead: 'text-muted-foreground text-xl',
      list: 'my-6 ml-6 list-disc [&>li]:mt-2',
      muted: 'text-muted-foreground text-sm',
      p: 'leading-7 [&:not(:first-child)]:mt-6',
      small: 'text-sm leading-none font-medium',
    },
  },
  defaultVariants: {
    variant: 'p',
  },
});

type TypographyVariant = NonNullable<
  VariantProps<typeof typographyVariants>['variant']
>;

const defaultElements: Record<TypographyVariant, ElementType> = {
  blockquote: 'blockquote',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  inlineCode: 'code',
  large: 'div',
  lead: 'p',
  list: 'ul',
  muted: 'p',
  p: 'p',
  small: 'small',
};

type TypographyProps<TElement extends ElementType> = {
  as?: TElement;
  className?: string;
  variant?: TypographyVariant;
} & Omit<ComponentPropsWithoutRef<TElement>, 'as' | 'className'>;

function Typography<TElement extends ElementType = 'p'>({
  as,
  className,
  variant = 'p',
  ...props
}: TypographyProps<TElement>) {
  const Component = as ?? defaultElements[variant];

  return (
    <Component
      className={cn(typographyVariants({ className, variant }))}
      data-slot="typography"
      data-variant={variant}
      {...props}
    />
  );
}

function TypographyH1(props: TypographyProps<'h1'>) {
  return <Typography {...props} as="h1" variant="h1" />;
}

function TypographyH2(props: TypographyProps<'h2'>) {
  return <Typography {...props} as="h2" variant="h2" />;
}

function TypographyH3(props: TypographyProps<'h3'>) {
  return <Typography {...props} as="h3" variant="h3" />;
}

function TypographyH4(props: TypographyProps<'h4'>) {
  return <Typography {...props} as="h4" variant="h4" />;
}

function TypographyP(props: TypographyProps<'p'>) {
  return <Typography {...props} as="p" variant="p" />;
}

function TypographyBlockquote(props: TypographyProps<'blockquote'>) {
  return <Typography {...props} as="blockquote" variant="blockquote" />;
}

function TypographyList(props: TypographyProps<'ul'>) {
  return <Typography {...props} as="ul" variant="list" />;
}

function TypographyInlineCode(props: TypographyProps<'code'>) {
  return <Typography {...props} as="code" variant="inlineCode" />;
}

function TypographyLead(props: TypographyProps<'p'>) {
  return <Typography {...props} as="p" variant="lead" />;
}

function TypographyLarge(props: TypographyProps<'div'>) {
  return <Typography {...props} as="div" variant="large" />;
}

function TypographySmall(props: TypographyProps<'small'>) {
  return <Typography {...props} as="small" variant="small" />;
}

function TypographyMuted(props: TypographyProps<'p'>) {
  return <Typography {...props} as="p" variant="muted" />;
}

export {
  Typography,
  TypographyBlockquote,
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyH4,
  TypographyInlineCode,
  TypographyLarge,
  TypographyLead,
  TypographyList,
  TypographyMuted,
  TypographyP,
  type TypographyProps,
  TypographySmall,
  type TypographyVariant,
  typographyVariants,
};
