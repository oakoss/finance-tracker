//  @ts-check

import pluginReact from '@eslint-react/eslint-plugin';
import betterTailwindcss from 'eslint-plugin-better-tailwindcss';
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
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: { 'better-tailwindcss': betterTailwindcss },
    rules: {
      ...betterTailwindcss.configs.recommended.rules,
      'better-tailwindcss/enforce-consistent-class-order': 'off',
      'better-tailwindcss/enforce-consistent-important-position': 'off',
      'better-tailwindcss/enforce-consistent-line-wrapping': 'off',
      'better-tailwindcss/enforce-consistent-variable-syntax': 'off',
      'better-tailwindcss/enforce-shorthand-classes': 'warn',
      'better-tailwindcss/no-contradicting-classes': 'off',
      'better-tailwindcss/no-deprecated-classes': 'warn',
      'better-tailwindcss/no-duplicate-classes': 'warn',
      'better-tailwindcss/no-unknown-classes': 'off',
      'better-tailwindcss/no-unregistered-classes': 'off',
    },
    settings: {
      'better-tailwindcss': {
        entryPoint: 'src/styles/globals.css',
        rootFontSize: 16,
        tsconfig: './tsconfig.json',
      },
    },
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
  ...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),
);
