import { config } from '@dotenvx/dotenvx';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import { defineConfig, mergeConfig } from 'vitest/config';

// Auto-load .env files using dotenv-flow convention (.env.test.local, .env.test, .env.local, .env)
config({ convention: 'flow', quiet: true });

export default mergeConfig(
  // Only bring in path aliases and react plugin — not Nitro, evlog, TanStack Start
  defineConfig({
    plugins: [viteTsConfigPaths({ projects: ['./tsconfig.json'] })],
  }),
  defineConfig({
    test: {
      // Automatically clear/restore mocks between tests to prevent pollution
      clearMocks: true,

      coverage: {
        exclude: [
          'src/**/*.{test,spec}.{ts,tsx}',
          'src/**/*.d.ts',
          // Integration/E2E territory
          'src/lib/auth.ts',
          'src/lib/auth-client.ts',
          'src/lib/email.ts',
          // Dev-only
          'src/lib/devtools.tsx',
          // Re-exports only
          'src/lib/logging/evlog.ts',
          // Nitro plugin — needs integration test
          'src/lib/logging/drain.ts',
        ],
        include: ['src/lib/**', 'src/configs/**', 'src/hooks/**'],
        provider: 'v8',
        reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
        reportOnFailure: true,
        reportsDirectory: './coverage',
      },

      environment: 'jsdom',

      environmentOptions: {
        jsdom: {
          url: 'http://localhost:3000',
        },
      },

      globals: true,

      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      restoreMocks: true,
      setupFiles: ['./test/setup.ts'],
      // Enable type-level testing with expectTypeOf / assertType
      typecheck: {
        checker: 'tsc',
        enabled: true,
        include: ['src/**/*.test-d.ts'],
        tsconfig: './tsconfig.json',
      },
    },
  }),
);
