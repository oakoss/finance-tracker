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
      globals: true,
      environment: 'jsdom',
      environmentOptions: {
        jsdom: {
          url: 'http://localhost:3000',
        },
      },
      setupFiles: ['./test/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      // Automatically clear/restore mocks between tests to prevent pollution
      clearMocks: true,
      restoreMocks: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
        reportsDirectory: './coverage',
        reportOnFailure: true,
        include: ['src/lib/**', 'src/configs/**', 'src/hooks/**'],
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
      },
      // Enable type-level testing with expectTypeOf / assertType
      typecheck: {
        enabled: true,
        checker: 'tsc',
        include: ['src/**/*.test-d.ts'],
        tsconfig: './tsconfig.json',
      },
    },
  }),
);
