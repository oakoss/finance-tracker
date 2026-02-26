import { config } from '@dotenvx/dotenvx';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// Auto-load .env files using dotenv-flow convention (.env.{NODE_ENV}.local, .env.{NODE_ENV}, .env.local, .env)
config({ convention: 'flow', quiet: true });

export default defineConfig({
  plugins: [viteTsConfigPaths({ projects: ['./tsconfig.json'] })],
  test: {
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
    projects: [
      // Unit tests — jsdom, mocks, no DB required
      {
        extends: true,
        test: {
          clearMocks: true,
          environment: 'jsdom',
          environmentOptions: {
            jsdom: {
              url: 'http://localhost:3000',
            },
          },
          exclude: ['test/**/*.integration.test.{ts,tsx}'],
          globals: true,
          include: [
            'src/**/*.{test,spec}.{ts,tsx}',
            'test/**/*.{test,spec}.{ts,tsx}',
          ],
          name: 'unit',
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
      },
      // Integration tests — real Postgres, parallel (each file gets its own connection + transaction)
      {
        extends: true,
        test: {
          environment: 'node',
          globals: true,
          globalSetup: ['./test/global-setup.ts'],
          include: ['test/**/*.integration.test.{ts,tsx}'],
          name: 'integration',
          pool: 'forks',
          testTimeout: 30_000,
        },
      },
    ],
  },
});
