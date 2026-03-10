/// <reference types="vite/client" />

import type { ImportMetaEnvAugmented as ArkenvImportMetaEnvAugmented } from '@arkenv/vite-plugin';

import type { Env } from '@/configs/env';

type ImportMetaEnvAugmented = ArkenvImportMetaEnvAugmented<typeof Env>;

interface ViteTypeOptions {
  // Disallow unknown keys in import.meta.env (requires Vite 6.3+)
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv extends ImportMetaEnvAugmented {}
