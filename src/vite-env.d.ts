/// <reference types="vite/client" />

import type { ImportMetaEnvAugmented as ArkenvImportMetaEnvAugmented } from '@arkenv/vite-plugin';

import type { Env } from '../vite.config';

type ImportMetaEnvAugmented = ArkenvImportMetaEnvAugmented<typeof Env>;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface ViteTypeOptions {
  // Disallow unknown keys in import.meta.env (requires Vite 6.3+)
  strictImportMetaEnv: unknown;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type
interface ImportMetaEnv extends ImportMetaEnvAugmented {}
