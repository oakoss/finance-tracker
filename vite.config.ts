import arkenvVitePlugin from '@arkenv/vite-plugin';
import { config } from '@dotenvx/dotenvx';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import posthog from '@posthog/rollup-plugin';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react';
import evlog from 'evlog/nitro/v3';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';
import killerInstincts from 'vite-plugin-killer-instincts';

import { Env } from './src/configs/env';

// Auto-load .env files using dotenv-flow convention
config({ convention: 'flow', quiet: true });

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  build: { sourcemap: 'hidden', target: 'es2023' },
  nitro: {
    modules: [
      evlog({
        env: { service: 'finance-tracker' },
        // Exclude noisy internal, static, and high-frequency auth paths
        exclude: [
          '/_src/**',
          '/__manifest',
          '/favicon.ico',
          '/@vite/**',
          '/@fs/**',
          '/node_modules/**',
          '/api/auth/get-session',
        ],
        sampling: {
          // Always keep error responses (4xx/5xx) and slow requests
          keep: [{ status: 400 }, { status: 500 }, { duration: 3000 }],
          rates: {
            // debug off in production
            debug: isProduction ? 0 : 100,
            error: 100,
            // 10% info sampling in production; always kept in development
            info: isProduction ? 10 : 100,
            warn: 100,
          },
        },
      }),
    ],
    plugins: ['./src/lib/logging/drain.ts'],
  },
  plugins: [
    devtools(),
    killerInstincts({ autoKill: true }),
    arkenvVitePlugin(Env),
    tailwindcss(),
    tanstackStart(),
    nitro(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
    paraglideVitePlugin({
      cookieName: 'APP_LOCALE',
      outdir: './src/paraglide',
      project: './project.inlang',
      strategy: ['cookie', 'preferredLanguage', 'baseLocale'],
    }),
    ...(process.env.POSTHOG_PERSONAL_API_KEY && process.env.POSTHOG_PROJECT_ID
      ? [
          posthog({
            personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY,
            projectId: process.env.POSTHOG_PROJECT_ID,
            sourcemaps: { deleteAfterUpload: true, enabled: isProduction },
          }),
        ]
      : []),
  ],
  resolve: { tsconfigPaths: true },
  server: { port: 3000, strictPort: true },
});
