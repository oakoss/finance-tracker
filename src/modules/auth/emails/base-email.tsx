import {
  Head,
  Html,
  pixelBasedPreset,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import * as React from 'react';

type BaseEmailProps = {
  preview: string;
  children: React.ReactNode;
};

export function BaseEmail({ preview, children }: BaseEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              colors: {
                background: 'oklch(1 0 0)',
                accent: 'oklch(0.967 0.001 286.375)',
                'accent-foreground': 'oklch(0.21 0.006 285.885)',
                border: 'oklch(0.92 0.004 286.32)',
                card: 'oklch(1 0 0)',
                foreground: 'oklch(0.141 0.005 285.823)',
                muted: 'oklch(0.967 0.001 286.375)',
                'muted-foreground': 'oklch(0.552 0.016 285.938)',
                primary: 'oklch(0.21 0.006 285.885)',
                'primary-foreground': 'oklch(0.985 0 0)',
                secondary: 'oklch(0.967 0.001 286.375)',
                'secondary-foreground': 'oklch(0.21 0.006 285.885)',
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
              If you did not request this email, you can safely ignore it.
            </Text>
          </Section>
        </Section>
      </Tailwind>
    </Html>
  );
}
