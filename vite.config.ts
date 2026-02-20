import arkenvVitePlugin from '@arkenv/vite-plugin';
import { config } from '@dotenvx/dotenvx';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import evlog from 'evlog/nitro/v3';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';
import viteTsConfigPaths from 'vite-tsconfig-paths';

import { Env } from './src/configs/env';

// Auto-load .env files using dotenv-flow convention
config({ convention: 'flow', quiet: true });

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  build: {
    target: 'es2023',
  },
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
            debug: isProduction ? 0 : 100,
            error: 100,
            // 10% info sampling in production; always kept in development
            info: isProduction ? 10 : 100,
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
