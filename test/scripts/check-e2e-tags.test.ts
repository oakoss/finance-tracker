import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findViolations,
  loadCanonicalTags,
  main,
  stripCommentsAndStrings,
  walk,
} from '~scripts/check-e2e-tags.mjs';

// Importing above already proves the entry-point guard holds: an unguarded
// `main()` would run the check and `process.exit` out of the runner.

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

const canonical = new Set(['@smoke', '@a11y', '@authenticated']);

/** Build a source file from lines so expected line numbers stay readable. */
function source(...lines: string[]) {
  return lines.join('\n');
}

/**
 * Expected output for `x = <literal>;` once the literal is fully blanked.
 * Asserting this exact string — rather than just the length — is what catches
 * a regex branch going missing, since an unstripped literal is the same length.
 */
function blanked(input: string) {
  return `x = ${' '.repeat(input.length - 'x = ;'.length)};`;
}

describe('stripCommentsAndStrings', () => {
  it('blanks line comments', () => {
    expect(stripCommentsAndStrings("a // tag: ['@bogus']")).toBe(
      'a                   ',
    );
  });

  it('blanks block comments', () => {
    expect(stripCommentsAndStrings("a /* tag: '@bogus' */ b")).toBe(
      'a                     b',
    );
  });

  it('blanks single- and double-quoted strings', () => {
    expect(stripCommentsAndStrings(`x = 'hello'; y = "world";`)).toBe(
      'x =        ; y =        ;',
    );
  });

  it('blanks template literals', () => {
    // The 15-character literal becomes 15 spaces; the rest is untouched.
    expect(stripCommentsAndStrings(`x = \`hello \${name}\`;`)).toBe(
      `x = ${' '.repeat(15)};`,
    );
  });

  it('preserves quoted tag tokens', () => {
    expect(stripCommentsAndStrings(`tag: ['@smoke', "@a11y"]`)).toBe(
      `tag: ['@smoke', "@a11y"]`,
    );
  });

  it('preserves total length so offsets stay valid', () => {
    const src = source(
      "import { test } from '@playwright/test';",
      '/* multi',
      ' * line */',
      'const q = `a',
      'b`;',
    );
    expect(stripCommentsAndStrings(src)).toHaveLength(src.length);
  });

  it('preserves newlines inside multi-line constructs', () => {
    const src = source('/*', ' * a', ' * b', ' */', 'code');
    const stripped = stripCommentsAndStrings(src);
    expect(stripped.split('\n')).toHaveLength(src.split('\n').length);
  });

  describe('template literal edge cases', () => {
    /* oxlint-disable no-template-curly-in-string --
       These fixtures hold JS source as data; the literal `${` sequences are
       the construct under test. */
    const cases: [name: string, input: string][] = [
      ['nested backticks', 'x = `${`inner`}`;'],
      ['escaped dollar', 'x = `\\${notinterp}`;'],
      ['lone trailing dollar', 'x = `cost $`;'],
      ['brace inside interpolation string', "x = `${'}'}`;"],
      ['many interpolations', `x = \`${'${}'.repeat(200)}\`;`],
    ];
    /* oxlint-enable no-template-curly-in-string */

    for (const [name, input] of cases) {
      it(`fully blanks ${name}`, () => {
        expect(stripCommentsAndStrings(input)).toBe(blanked(input));
      });
    }
  });

  it('returns promptly on an unclosed literal full of interpolations', () => {
    // The shape that made the old pattern backtrack exponentially. Nothing
    // matches without a closing backtick, so the source comes back unchanged;
    // the point is that it comes back at all.
    // oxlint-disable-next-line no-template-curly-in-string
    const input = `x = \`${'${}'.repeat(40)}`;
    expect(stripCommentsAndStrings(input)).toBe(input);
  }, 10_000);
});

describe('findViolations', () => {
  it('flags an unknown tag', () => {
    const src = `test.describe('x', { tag: ['@bogus'] }, () => {});`;
    expect(findViolations(src, 'a.ts', canonical)).toEqual([
      { file: 'a.ts', lineNumber: 1, tag: '@bogus' },
    ]);
  });

  it('accepts canonical tags', () => {
    const src = `test.describe('x', { tag: ['@smoke', '@a11y'] }, () => {});`;
    expect(findViolations(src, 'a.ts', canonical)).toEqual([]);
  });

  it('does not let an apostrophe in a regex hide a later violation', () => {
    // A lone `'` must die at end of line; JS quoted strings cannot span
    // newlines, and treating it as an opener blanks the code that follows.
    const src = source(
      String.raw`const re = /don't/;`,
      `test.describe('x', { tag: ['@bogus'] }, () => {});`,
    );
    expect(findViolations(src, 'a.ts', canonical)).toEqual([
      { file: 'a.ts', lineNumber: 2, tag: '@bogus' },
    ]);
  });

  it('ignores tags inside comments and strings', () => {
    const src = source(
      "// tag: ['@bogus']",
      "/* tag: ['@alsobogus'] */",
      `const s = "tag: ['@stringbogus']";`,
    );
    expect(findViolations(src, 'a.ts', canonical)).toEqual([]);
  });

  it('reports an empty tag block', () => {
    const src = `test.describe('x', { tag: [] }, () => {});`;
    expect(findViolations(src, 'a.ts', canonical)).toEqual([
      { file: 'a.ts', lineNumber: 1, tag: '<empty tag block>' },
    ]);
  });

  it('reports the correct line after a multi-line block comment', () => {
    const src = source(
      "import { test } from '@playwright/test';",
      '/*',
      ' * a comment',
      ' * spanning lines',
      ' */',
      `test.describe('x', { tag: ['@bogus'] }, () => {});`,
    );
    expect(findViolations(src, 'a.ts', canonical)).toEqual([
      { file: 'a.ts', lineNumber: 6, tag: '@bogus' },
    ]);
  });

  it('reports the correct line after a multi-line template literal', () => {
    const src = source(
      'const q = `',
      '  SELECT 1',
      '`;',
      `test.describe('x', { tag: ['@bogus'] }, () => {});`,
    );
    expect(findViolations(src, 'a.ts', canonical)).toEqual([
      { file: 'a.ts', lineNumber: 4, tag: '@bogus' },
    ]);
  });

  it('flags each unknown tag in an array', () => {
    const src = `test.describe('x', { tag: ['@smoke', '@bogus', '@other'] }, () => {});`;
    expect(findViolations(src, 'a.ts', canonical)).toEqual([
      { file: 'a.ts', lineNumber: 1, tag: '@bogus' },
      { file: 'a.ts', lineNumber: 1, tag: '@other' },
    ]);
  });

  it('handles the single-string tag form', () => {
    const src = `test.describe('x', { tag: '@bogus' }, () => {});`;
    expect(findViolations(src, 'a.ts', canonical)).toEqual([
      { file: 'a.ts', lineNumber: 1, tag: '@bogus' },
    ]);
  });

  it('handles the double-quoted single-string tag form', () => {
    const src = `test.describe('x', { tag: "@bogus" }, () => {});`;
    expect(findViolations(src, 'a.ts', canonical)).toEqual([
      { file: 'a.ts', lineNumber: 1, tag: '@bogus' },
    ]);
  });
});

describe('walk', () => {
  it('yields TypeScript sources recursively and skips everything else', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'walk-'));
    mkdirSync(path.join(root, 'nested'));
    const files = [
      'a.ts',
      'b.tsx',
      'c.mts',
      'd.cts',
      'ignored.txt',
      'ignored.md',
      'ignored.js',
      'nested/e.ts',
    ];
    for (const f of files) writeFileSync(path.join(root, f), '');

    const found = [...walk(root)]
      .map((f: string) => path.relative(root, f))
      .toSorted();
    expect(found).toEqual(
      [
        'a.ts',
        'b.tsx',
        'c.mts',
        'd.cts',
        path.join('nested', 'e.ts'),
      ].toSorted(),
    );
  });
});

describe('loadCanonicalTags', () => {
  it('parses the canonical tags out of the rule doc', () => {
    const tags = loadCanonicalTags();
    expect(tags.size).toBeGreaterThan(0);
    expect(tags).toContain('@smoke');
    expect(tags).toContain('@a11y');
  });

  it('matches only indented bullets, not top-level ones', () => {
    // `\s+` would consume the blank line and capture `@toplevel` too,
    // silently widening the canonical set.
    const doc = source('intro', '', '- `@toplevel`', '', '  - `@nested`', '');
    expect([...loadCanonicalTags(doc)]).toEqual(['@nested']);
  });

  it('throws when the doc yields no tags', () => {
    expect(() => loadCanonicalTags('# Doc\n\nNothing here.\n')).toThrow(
      /No canonical tags found/,
    );
  });
});

describe('main', () => {
  it('throws rather than reporting success when it scans no files', () => {
    const empty = mkdtempSync(path.join(tmpdir(), 'no-e2e-'));
    expect(() => main(empty)).toThrow(/No e2e test files found/);
  });
});

describe('entry point', () => {
  it('runs the check when executed directly', () => {
    const result = spawnSync('node', ['scripts/check-e2e-tags.mjs'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    // A dead entry-point guard exits 0 having printed nothing, so the gate
    // would pass vacuously. Any output at all proves `main()` ran.
    const output = `${result.stdout}${result.stderr}`;
    expect(output).not.toBe('');
    expect(output).toMatch(/canonical/);
  }, 30_000);
});
