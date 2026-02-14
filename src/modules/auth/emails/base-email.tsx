import {
  Head,
  Html,
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
          theme: {
            extend: {
              colors: {
                background: '#0b1220',
                panel: '#121b2d',
                border: '#1c2841',
                text: '#f8fafc',
                muted: '#94a3b8',
                accent: '#38bdf8',
              },
            },
          },
        }}
      >
        <Section className="bg-background px-6 py-10">
          <Section className="mx-auto max-w-[520px] rounded-2xl border border-border bg-panel px-8 py-10">
            {children}
            <Text className="mt-10 text-xs text-muted">
              If you did not request this email, you can safely ignore it.
            </Text>
          </Section>
        </Section>
      </Tailwind>
    </Html>
  );
}
