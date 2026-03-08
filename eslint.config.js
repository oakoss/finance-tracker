//  @ts-check

import pluginReact from '@eslint-react/eslint-plugin';
import js from '@eslint/js';
import pluginQuery from '@tanstack/eslint-plugin-query';
import pluginRouter from '@tanstack/eslint-plugin-router';
import configPrettier from 'eslint-config-prettier';
import betterTailwindcss from 'eslint-plugin-better-tailwindcss';
import importX from 'eslint-plugin-import-x';
// @ts-ignore
import jsxA11y from 'eslint-plugin-jsx-a11y';
import perfectionist from 'eslint-plugin-perfectionist';
import playwright from 'eslint-plugin-playwright';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import unicorn from 'eslint-plugin-unicorn';
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
  ]),
  {
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
    },
  },
  ...pluginRouter.configs['flat/recommended'],
  ...pluginQuery.configs['flat/recommended'],
  {
    extends: [js.configs.recommended, unicorn.configs.recommended],
    plugins: {
      // @ts-expect-error -- types are missing
      'import-x': importX,
      perfectionist,
    },
    rules: {
      eqeqeq: 'error',
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
      'import-x/no-duplicates': ['error', { 'prefer-inline': true }],
      'import-x/no-relative-parent-imports': 'error',
      'no-console': 'warn',
      'perfectionist/sort-exports': [
        'error',
        {
          ignoreCase: true,
          order: 'asc',
          type: 'alphabetical',
        },
      ],
      'perfectionist/sort-imports': [
        'error',
        {
          groups: [
            'type-import',
            ['value-builtin', 'value-external'],
            'type-internal',
            'value-internal',
            ['type-parent', 'type-sibling', 'type-index'],
            ['value-parent', 'value-sibling', 'value-index'],
            'ts-equals-import',
            'unknown',
          ],
          ignoreCase: true,
          internalPattern: ['^@/.+', '^~e2e/.+', '^~test/.+'],
          newlinesBetween: 1,
          order: 'asc',
          type: 'alphabetical',
        },
      ],
      'perfectionist/sort-named-exports': [
        'error',
        {
          ignoreCase: true,
          order: 'asc',
          type: 'alphabetical',
        },
      ],
      'perfectionist/sort-named-imports': [
        'error',
        {
          ignoreCase: true,
          order: 'asc',
          type: 'alphabetical',
        },
      ],
      'perfectionist/sort-objects': [
        'error',
        {
          type: 'unsorted',
          useConfigurationIf: {
            callingFunctionNamePattern: String.raw`^createFileRoute\(`,
          },
        },
        {
          ignoreCase: true,
          order: 'asc',
          type: 'alphabetical',
        },
      ],
      'unicorn/filename-case': [
        'error',
        {
          cases: {
            camelCase: false,
            kebabCase: true,
            pascalCase: false,
          },
          ignore: [
            String.raw`^\$.*\.tsx?$`, // TanStack Router parameter files ($param)
            String.raw`^-.*\.tsx?$`, // TanStack Router ignored route files (-shared)
          ],
        },
      ],
      'unicorn/no-null': 'off',
      'unicorn/prefer-class-fields': 'error',
      'unicorn/prevent-abbreviations': 'off',
    },
  },
  {
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/only-throw-error': 'off',
      '@typescript-eslint/prefer-return-this-type': 'error',
      '@typescript-eslint/restrict-template-expressions': 'off',
      'perfectionist/sort-object-types': [
        'error',
        {
          ignoreCase: true,
          order: 'asc',
          type: 'alphabetical',
        },
      ],
    },
  },
  {
    extends: [
      pluginReact.configs['recommended-type-checked'],
      reactHooks.configs.flat.recommended,
    ],
    files: ['**/*.{jsx,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'jsx-a11y': jsxA11y,
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      '@eslint-react/hooks-extra/no-direct-set-state-in-use-effect': 'off',
      '@eslint-react/no-context-provider': 'off',
      '@eslint-react/no-nested-component-definitions': 'off',
      'jsx-a11y/no-static-element-interactions': [
        'error',
        {
          allowExpressionValues: true,
          handlers: ['onClick', 'onKeyDown', 'onKeyPress', 'onKeyUp'],
        },
      ],
      'perfectionist/sort-jsx-props': [
        'error',
        {
          customGroups: [
            { elementNamePattern: '^(key|ref)$', groupName: 'reserved' },
            { elementNamePattern: '^on.+', groupName: 'callback' },
          ],
          groups: ['reserved', 'shorthand-prop', 'prop', 'callback'],
          ignoreCase: true,
          order: 'asc',
          type: 'alphabetical',
        },
      ],
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/incompatible-library': 'off',
      'react/jsx-no-bind': 'off',
      'react/jsx-no-constructed-context-values': 'off',
      'react/jsx-no-useless-fragment': 'off',
      'react/no-danger': 'off',
      'react/prop-types': 'off',
    },
    settings: {
      'jsx-a11y': {
        components: {
          Button: 'button',
          Input: 'input',
          Select: 'select',
        },
      },
      react: { version: 'detect' },
    },
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'better-tailwindcss': betterTailwindcss,
    },
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
    extends: [playwright.configs['flat/recommended']],
    files: ['e2e/**/*'],
    rules: {
      'playwright/no-standalone-expect': 'error',
    },
  },
  {
    files: [
      'src/configs/env.ts',
      'src/lib/db/seed/**/*',
      'src/lib/db/reset.ts',
      'src/lib/logger.ts',
      '**/*.stories.*',
      '**/*.test.*',
      '**/*.spec.*',
      'e2e/**/*',
      'test/**/*',
    ],
    rules: {
      '@typescript-eslint/no-empty-function': 'off',
      'no-console': 'off',
      'unicorn/prefer-top-level-await': 'off',
    },
  },
  // -- Restricted imports (all restrictions in one block) --
  {
    files: ['**/*.{ts,tsx}'],
    ignores: [
      'src/components/filters/**',
      'src/components/icons.tsx',
      'src/components/ui/**',
      'src/lib/i18n/date.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              message: 'Import from @/lib/i18n/date instead.',
              name: '@date-fns/tz',
            },
            {
              message: 'Import from @/lib/i18n/date instead.',
              name: 'date-fns',
            },
            {
              message:
                'Import from @/components/ui/* instead of @base-ui/react directly.',
              name: '@base-ui/react',
            },
            {
              message: 'Import from @/components/icons instead.',
              name: 'lucide-react',
            },
            {
              message:
                'Import from @/components/ui/calendar instead of react-day-picker directly.',
              name: 'react-day-picker',
            },
          ],
          patterns: [
            {
              group: ['@date-fns/*'],
              message: 'Import from @/lib/i18n/date instead.',
            },
            {
              group: ['date-fns/*'],
              message: 'Import from @/lib/i18n/date instead.',
            },
          ],
        },
      ],
    },
  },
  // Override: src/lib/i18n/date.ts may use date-fns directly
  {
    files: ['src/lib/i18n/date.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              message:
                'Import from @/components/ui/* instead of @base-ui/react directly.',
              name: '@base-ui/react',
            },
            {
              message: 'Import from @/components/icons instead.',
              name: 'lucide-react',
            },
            {
              message:
                'Import from @/components/ui/calendar instead of react-day-picker directly.',
              name: 'react-day-picker',
            },
          ],
        },
      ],
    },
  },
  // Override: src/components/icons.tsx may use lucide-react directly
  {
    files: ['src/components/icons.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              message: 'Import from @/lib/i18n/date instead.',
              name: '@date-fns/tz',
            },
            {
              message: 'Import from @/lib/i18n/date instead.',
              name: 'date-fns',
            },
            {
              message:
                'Import from @/components/ui/* instead of @base-ui/react directly.',
              name: '@base-ui/react',
            },
            {
              message:
                'Import from @/components/ui/calendar instead of react-day-picker directly.',
              name: 'react-day-picker',
            },
          ],
          patterns: [
            {
              group: ['@date-fns/*'],
              message: 'Import from @/lib/i18n/date instead.',
            },
            {
              group: ['date-fns/*'],
              message: 'Import from @/lib/i18n/date instead.',
            },
          ],
        },
      ],
    },
  },
  // Override: UI components may use @base-ui/react and react-day-picker directly
  {
    files: ['src/components/ui/**', 'src/components/filters/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              message: 'Import from @/lib/i18n/date instead.',
              name: '@date-fns/tz',
            },
            {
              message: 'Import from @/lib/i18n/date instead.',
              name: 'date-fns',
            },
            {
              message: 'Import from @/components/icons instead.',
              name: 'lucide-react',
            },
          ],
          patterns: [
            {
              group: ['@date-fns/*'],
              message: 'Import from @/lib/i18n/date instead.',
            },
            {
              group: ['date-fns/*'],
              message: 'Import from @/lib/i18n/date instead.',
            },
          ],
        },
      ],
    },
  },
  configPrettier,
);
