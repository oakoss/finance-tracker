import { readFile, writeFile } from 'node:fs/promises';

const schemaPath = new URL('../src/modules/auth/schema.ts', import.meta.url);

const original = await readFile(schemaPath, 'utf8');
let updated = original;

updated = updated.replace(
  'import { relations } from "drizzle-orm";\n',
  'import { relations, sql } from "drizzle-orm";\n',
);

updated = updated.replace(
  'import { relations } from "drizzle-orm";',
  'import { relations, sql } from "drizzle-orm";',
);

updated = updated.replace(
  'from "drizzle-orm/pg-core";',
  'from "drizzle-orm/pg-core";',
);

updated = updated.replaceAll('pg_catalog.gen_random_uuid()', 'uuidv7()');

if (updated === original) {
  throw new Error('Auth schema postprocess made no changes.');
}

await writeFile(schemaPath, updated);
