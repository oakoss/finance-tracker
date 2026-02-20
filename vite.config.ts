import arkenvVitePlugin from '@arkenv/vite-plugin';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import evlog from 'evlog/nitro/v3';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';
import viteTsConfigPaths from 'vite-tsconfig-paths';

import { Env } from './src/env';

export { Env } from './src/env';

const IS_PRODUCTION = process.env.OTEL_RESOURCE_ATTRIBUTES?.includes(
  'deployment.environment=production',
);

const config = defineConfig({
  nitro: {
    plugins: ['./src/lib/logging/drain.ts'],
    modules: [
      evlog({
        env: {
          service: 'finance-tracker',
        },
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
          rates: {
            // debug off in production
            debug: IS_PRODUCTION ? 0 : 100,
            error: 100,
            // 10% info sampling in production; always kept in development
            info: IS_PRODUCTION ? 10 : 100,
            warn: 100,
          },
          // Always keep error responses (4xx/5xx) and slow requests
          keep: [{ status: 400 }, { status: 500 }, { duration: 3000 }],
        },
      }),
    ],
  },
  plugins: [
    devtools(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    arkenvVitePlugin(Env),
    tailwindcss(),
    tanstackStart(),
    nitro(),
    viteReact(),
    paraglideVitePlugin({
      cookieName: 'APP_LOCALE',
      outdir: './src/paraglide',
      project: './project.inlang',
      strategy: ['cookie', 'preferredLanguage', 'baseLocale'],
    }),
  ],
  server: {
    port: 3000,
  },
});

export default config;
