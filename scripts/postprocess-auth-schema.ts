import { readFile, writeFile } from 'node:fs/promises';

const schemaPath = new URL('../src/modules/auth/db/schema.ts', import.meta.url);

const original = await readFile(schemaPath, 'utf8');
let updated = original;

// Replace drizzle-orm import: keep only `sql`, remove `relations` (managed in module relations files)
updated = updated.replace(
  'import { relations } from "drizzle-orm";',
  'import { sql } from "drizzle-orm";',
);
updated = updated.replace(
  'import { relations, sql } from "drizzle-orm";',
  'import { sql } from "drizzle-orm";',
);

// Replace gen_random_uuid() with uuidv7()
updated = updated.replaceAll('pg_catalog.gen_random_uuid()', 'uuidv7()');

// Replace timestamp('column_name') / timestamp("column_name") with timestamp({ withTimezone: true })
updated = updated.replaceAll(
  /timestamp\(["']([^"']+)["']\)/g,
  'timestamp({ withTimezone: true })',
);

// Remove explicit column name strings from other column types
updated = updated.replaceAll(/uuid\(["']([^"']+)["']\)/g, 'uuid()');
updated = updated.replaceAll(/text\(["']([^"']+)["']\)/g, 'text()');
updated = updated.replaceAll(/boolean\(["']([^"']+)["']\)/g, 'boolean()');

// Remove relations definitions (managed in src/modules/*/relations.ts)
updated = updated.replaceAll(
  /\nexport const \w+Relations = relations\([^)]+, \([^)]+\) => \(\{[\s\S]*?\}\)\);\n/g,
  '\n',
);

if (updated === original) {
  throw new Error('Auth schema postprocess made no changes.');
}

await writeFile(schemaPath, updated);
