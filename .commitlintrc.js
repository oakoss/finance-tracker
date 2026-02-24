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
