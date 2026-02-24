import { defineConfig } from 'cz-git';

export default defineConfig({
  extends: ['@commitlint/config-conventional'],
  prompt: {
    alias: {
      ci: 'ci: update workflows',
      db: 'chore(db): update schema',
      deps: 'chore(deps): bump dependencies',
      docs: 'docs: update docs',
      env: 'chore(env): update env validation',
      i18n: 'chore(i18n): update translations',
      log: 'chore(logging): update logging configuration',
    },
    allowCustomScopes: false,
    allowEmptyScopes: true,
    scopes: [
      'auth',
      'ci',
      'config',
      'db',
      'deps',
      'docs',
      'email',
      'env',
      'finance',
      'i18n',
      'infra',
      'logging',
      'routes',
      'scripts',
      'tests',
      'todos',
      'tooling',
      'ui',
    ],
    skipQuestions: ['breaking', 'footer', 'issues'],
  },
  rules: {
    'body-max-line-length': [0, 'always'],
    'footer-max-line-length': [0, 'always'],
    'header-max-length': [2, 'always', 200],
  },
});
