import { defineConfig } from 'cz-git';

export default defineConfig({
  extends: ['@commitlint/config-conventional'],
  prompt: {
    alias: {
      docs: 'docs: update docs',
      db: 'chore(db): update schema',
      env: 'chore(env): update env validation',
      deps: 'chore(deps): bump dependencies',
      ci: 'ci: update workflows',
    },
    allowCustomScopes: false,
    allowEmptyScopes: true,
    scopes: [
      'auth',
      'db',
      'todos',
      'email',
      'env',
      'routes',
      'ui',
      'docs',
      'ci',
      'config',
      'deps',
      'scripts',
      'tooling',
      'infra',
      'tests',
    ],
  },
  rules: {
    'header-max-length': [2, 'always', 200],
    'body-max-line-length': [0, 'always'],
  },
});
