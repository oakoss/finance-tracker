//  @ts-check

import pluginReact from '@eslint-react/eslint-plugin';
import oxlint from 'eslint-plugin-oxlint';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores([
    'node_modules',
    'dist',
    '.nitro',
    '.output',
    '.tanstack',
    'blob-report',
    'coverage',
    'playwright-report',
    'test-results',
    'storybook-static',
    '**/paraglide',
    '**/*.gen.ts',
    'src/env.d.ts',
    '.env*',
  ]),
  { languageOptions: { ecmaVersion: 'latest', globals: globals.browser } },
  {
    extends: [tseslint.configs.base],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    extends: [pluginReact.configs['recommended-type-checked']],
    files: ['**/*.{jsx,tsx}'],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/hooks/use-analytics.ts', 'src/lib/analytics.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              message: 'Use @/hooks/use-analytics instead.',
              name: 'posthog-js/react',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', 'src/lib/email.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          message: 'Use static import instead of dynamic import().',
          selector: 'ImportExpression',
        },
      ],
    },
  },
  ...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),
);
