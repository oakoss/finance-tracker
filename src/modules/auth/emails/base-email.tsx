import * as React from 'react';
import {
  Head,
  Html,
  pixelBasedPreset,
  Preview,
  Section,
  Tailwind,
  Text,
} from 'react-email';

import { m } from '@/paraglide/messages';

type BaseEmailProps = {
  children: React.ReactNode;
  lang?: string;
  preview: string;
};

export function BaseEmail({ children, lang = 'en', preview }: BaseEmailProps) {
  return (
    <Html lang={lang}>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              colors: {
                accent: 'oklch(0.967 0.001 247)',
                'accent-foreground': 'oklch(0.21 0.006 247)',
                background: 'oklch(1 0 0)',
                border: 'oklch(0.92 0.004 247)',
                card: 'oklch(1 0 0)',
                foreground: 'oklch(0.141 0.005 247)',
                muted: 'oklch(0.967 0.001 247)',
                'muted-foreground': 'oklch(0.46 0.016 247)',
                primary: 'oklch(0.45 0.08 245)',
                'primary-foreground': 'oklch(0.985 0 0)',
                secondary: 'oklch(0.967 0.001 247)',
                'secondary-foreground': 'oklch(0.21 0.006 247)',
              },
              fontFamily: {
                sans: [
                  '-apple-system',
                  'BlinkMacSystemFont',
                  'Segoe UI',
                  'Roboto',
                  'Oxygen',
                  'Ubuntu',
                  'Cantarell',
                  'Fira Sans',
                  'Droid Sans',
                  'Helvetica Neue',
                  'sans-serif',
                ],
              },
            },
          },
        }}
      >
        <Section className="bg-background px-6 py-10 font-sans text-sm text-foreground">
          <Section className="mx-auto max-w-130 rounded-2xl border border-border bg-card px-8 py-10">
            {children}
            <Text className="mt-10 text-xs text-muted-foreground">
              {m['email.common.ignoreNotice']()}
            </Text>
          </Section>
        </Section>
      </Tailwind>
    </Html>
  );
}
