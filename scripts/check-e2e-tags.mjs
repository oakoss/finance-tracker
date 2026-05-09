#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const E2E_ROOT = path.join(REPO_ROOT, 'e2e');
const RULE_DOC = path.join(REPO_ROOT, '.claude/rules/e2e-testing.md');

// Strip line comments, block comments, and string/template literals so the
// tag regex can't match `// tag: ['@bogus']` or `"tag: ['@x']"`.
function stripCommentsAndStrings(src) {
  return src.replaceAll(
    /\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|\$\{[^}]*\}|[^`\\])*`/g,
    (match) => {
      // Preserve `'@xxx'` tokens — those are the tag literals we care about.
      if (/^'@[A-Za-z0-9_-]+'$/.test(match)) return match;
      if (/^"@[A-Za-z0-9_-]+"$/.test(match)) return match;
      return ' '.repeat(match.length);
    },
  );
}

const TAG_BLOCK =
  /tag:\s*(?:\[([^\]]*)\]|'(@[A-Za-z0-9_-]+)'|"(@[A-Za-z0-9_-]+)")/g;
const TAG_TOKEN = /['"](@[A-Za-z0-9_-]+)['"]/g;

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile() && /\.(?:m|c)?tsx?$/.test(entry.name)) yield full;
  }
}

function loadCanonicalTags() {
  const doc = readFileSync(RULE_DOC, 'utf8');
  const tags = new Set();
  for (const match of doc.matchAll(/^\s+-\s+`(@[A-Za-z0-9_-]+)`/gm)) {
    tags.add(match[1]);
  }
  if (tags.size === 0) {
    throw new Error(
      `No canonical tags found in ${path.relative(REPO_ROOT, RULE_DOC)}. ` +
        'Expected nested bullet items like `  - \\`@smoke\\` — ...`.',
    );
  }
  return tags;
}

function findViolations(content, file, canonical) {
  const stripped = stripCommentsAndStrings(content);
  const violations = [];
  for (const block of stripped.matchAll(TAG_BLOCK)) {
    const offset = block.index;
    const lineNumber = stripped.slice(0, offset).split('\n').length;
    const tokens = [];
    if (block[1] !== undefined) {
      // Array form: `tag: ['@a', '@b']`
      for (const token of block[1].matchAll(TAG_TOKEN)) tokens.push(token[1]);
    } else {
      // Single-string form: `tag: '@a'` or `tag: "@a"`
      tokens.push(block[2] ?? block[3]);
    }
    if (tokens.length === 0) {
      violations.push({ file, lineNumber, tag: '<empty tag block>' });
      continue;
    }
    for (const tag of tokens) {
      if (!canonical.has(tag)) violations.push({ file, lineNumber, tag });
    }
  }
  return violations;
}

function main() {
  const canonical = loadCanonicalTags();
  const violations = [];
  for (const file of walk(E2E_ROOT)) {
    const content = readFileSync(file, 'utf8');
    const relative = path.relative(REPO_ROOT, file);
    violations.push(...findViolations(content, relative, canonical));
  }

  if (violations.length > 0) {
    console.error('Unknown e2e test tags:');
    for (const v of violations) {
      console.error(`  ${v.file}:${v.lineNumber}  ${v.tag}`);
    }
    console.error(
      `\nCanonical tags (sourced from .claude/rules/e2e-testing.md): ` +
        `${[...canonical].toSorted((a, b) => a.localeCompare(b)).join(', ')}\n` +
        'To add a new tag: update .claude/rules/e2e-testing.md AND wire ' +
        'the project filter in playwright.config.ts.',
    );
    process.exit(1);
  }

  console.log(
    `OK — all e2e test tags are canonical (${canonical.size} known).`,
  );
}

try {
  main();
} catch (error) {
  console.error('check-e2e-tags: script error');
  console.error(error);
  // Exit 2 to distinguish infra errors from a real violation (exit 1).
  process.exit(2);
}
