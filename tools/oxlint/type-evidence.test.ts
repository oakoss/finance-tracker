import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { RuleTester } from 'oxlint/plugins-dev';

import typeEvidence from './type-evidence.ts';

const tester = new RuleTester({
  languageOptions: { parserOptions: { lang: 'ts' } },
});

const { rules } = typeEvidence;

tester.run(
  'type-evidence/no-chained-type-assertions',
  rules['no-chained-type-assertions'],
  {
    invalid: [
      {
        code: 'const a = x as unknown as Foo;',
        errors: [{ messageId: 'chained' }],
      },
      // oxlint's ESTree drops parens, so this is the same AST as the case
      // above. Kept to catch a parser change that starts preserving them.
      {
        code: 'const a = (x as unknown) as Foo;',
        errors: [{ messageId: 'chained' }],
      },
      // A non-null assertion between the two must not break the chain.
      {
        code: 'const a = (x as unknown)! as Foo;',
        errors: [{ messageId: 'chained' }],
      },
      {
        code: 'const a = (x as unknown satisfies Bar) as Foo;',
        errors: [{ messageId: 'chained' }],
      },
      // A chain nested in a larger expression still reports once.
      {
        code: 'const a = (x as unknown as Foo).y;',
        errors: [{ messageId: 'chained' }],
      },
      { code: 'fn(x as unknown as Foo);', errors: [{ messageId: 'chained' }] },
      // Pins the upward chain-link walk: without it these report twice.
      {
        code: 'const a = (x as unknown as Foo)! as Bar;',
        errors: [{ messageId: 'chained' }],
      },
      {
        code: 'const a = (x as unknown as Foo) satisfies Baz as Bar;',
        errors: [{ messageId: 'chained' }],
      },
      // Two independent chains are two findings.
      {
        code: 'fn(x as unknown as Foo, y as unknown as Bar);',
        errors: [{ messageId: 'chained' }, { messageId: 'chained' }],
      },
      // Angle-bracket assertions chain the same way.
      {
        code: 'const a = <Foo>(<unknown>x);',
        errors: [{ messageId: 'chained' }],
      },
      // A three-deep chain is one finding, not two.
      {
        code: 'const a = x as unknown as Foo as Bar;',
        errors: [{ messageId: 'chained' }],
      },
      {
        code: 'const a = x as const as Foo;',
        errors: [{ messageId: 'chained' }],
      },
    ],
    valid: [
      'const a = x as Foo;',
      'const a = { k: 1 } as const;',
      'const a = x as unknown;',
      // Sibling assertions are not a chain.
      'fn(x as Foo, y as Bar);',
      // Known limit: a chain split across statements is syntactically invisible.
      'const u = x as unknown; const a = u as Foo;',
      // A chain link alone is not a chain — these must not count toward depth.
      'const a = x! as Foo;',
      'const a = (x satisfies Foo) as Bar;',
    ],
  },
);

tester.run(
  'type-evidence/no-known-value-widening',
  rules['no-known-value-widening'],
  {
    invalid: [
      {
        code: 'const M: Record<Stage, number> = { a: 1 };',
        errors: [{ messageId: 'widened' }],
      },
      {
        code: 'const M: Record<keyof typeof V, string> = { a: "x" };',
        errors: [{ messageId: 'widened' }],
      },
      // A closed literal union is the case the rule exists for.
      {
        code: 'const M: Record<"a" | "b", number> = { a: 1, b: 2 };',
        errors: [{ messageId: 'widened' }],
      },
      // Pins the rendered message so a renamed `data` key cannot ship `{{name}}`.
      {
        code: 'export const M: Record<Stage, number> = { a: 1 };',
        errors: [
          {
            message:
              'The Record annotation on `M` discards its known keys. Use `satisfies` to keep inference while still checking the shape.',
          },
        ],
      },
    ],
    valid: [
      // `satisfies` is the fix the rule asks for.
      'const M = { a: 1 } satisfies Record<Stage, number>;',
      // Open keys never carried evidence, and these are indexed at runtime.
      'const M: Record<string, number> = { a: 1 };',
      'const M: Record<number, string> = { 1: "a" };',
      'const M: Record<symbol, string> = { [s]: "a" };',
      'const M: Record<PropertyKey, string> = { a: "x" };',
      // oxlint-disable-next-line no-template-curly-in-string -- TS source under test
      'const M: Record<`${string}-id`, string> = { "a-id": "x" };',
      // One open member widens the union back to an indexable key.
      'const M: Record<string | Stage, number> = { a: 1 };',
      'const M: Record<string | number, number> = { a: 1 };',
      'const M: Record<keyof any, number> = { a: 1 };',
      'const M: Record<any, number> = { a: 1 };',
      'const M: Record<unknown, number> = { a: 1 };',
      // No type arguments at all must not throw.
      'const M: Record = { a: 1 };',
      // Qualified names are a different `Record`.
      'const M: N.Record<Stage, number> = { a: 1 };',
      // Empty literals are accumulators; the annotation is their only contract.
      'const M: Record<Stage, number> = {};',
      // `satisfies` is not an equivalent fix for a reassignable binding.
      'let M: Record<Stage, number> = { a: 1 };',
      // Destructured bindings have no single annotation to move.
      'const { a }: Record<Stage, number> = { a: 1 };',
      // Known limit: the rule matches `Record` directly, not through a wrapper.
      'const M: Readonly<Record<Stage, number>> = { a: 1 };',
      'const M: { a: number } = { a: 1 };',
      // Not an object literal, so there is nothing to infer from.
      'const M: Record<Stage, number> = build();',
      'const M = { a: 1 };',
    ],
  },
);

tester.run(
  'type-evidence/no-shape-in-type-names',
  rules['no-shape-in-type-names'],
  {
    invalid: [
      {
        code: 'type UserShape = { id: string };',
        errors: [{ messageId: 'forbiddenName' }],
      },
      {
        code: 'type shapeOfThing = { id: string };',
        errors: [{ messageId: 'forbiddenName' }],
      },
      {
        code: 'interface PayloadShape { id: string }',
        errors: [{ messageId: 'forbiddenName' }],
      },
      {
        code: 'type USER_SHAPE = { id: string };',
        errors: [{ messageId: 'forbiddenName' }],
      },
      {
        code: 'type user_shape = { id: string };',
        errors: [{ messageId: 'forbiddenName' }],
      },
      // The bare word is the most obvious violation.
      {
        code: 'type Shape = { id: string };',
        errors: [{ messageId: 'forbiddenName' }],
      },
      // Tokenized, so the capitalised split does flag where `Shapeshifter` does not.
      {
        code: 'type ShapeShifter = { id: string };',
        errors: [{ messageId: 'forbiddenName' }],
      },
    ],
    valid: [
      'type User = { id: string };',
      // Contains the letters but not the word.
      'type Reshaped = { id: string };',
      'type Shapeshifter = { id: string };',
      // The rule names types, not members — a `shape` property is fine.
      'type Circle = { shape: string };',
      // Known limit: enums, classes and type parameters are out of scope.
      'enum ShapeKind { A }',
      'class UserShape {}',
      'type Wrapper<TShape> = TShape;',
    ],
  },
);

// Renaming a rule, moving this file, or switching a rule to "off" would disable
// enforcement in CI while every case above still passes, silently rotting the
// suppression comments across src/ and e2e/.
it('stays wired to .oxlintrc.json', () => {
  const configPath = path.resolve('.oxlintrc.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8')) as {
    jsPlugins: ({ name: string; specifier: string } | string)[];
    rules: Record<string, unknown>;
  };

  const pluginName = 'type-evidence';
  expect(typeEvidence.meta?.name).toBe(pluginName);

  const entry = config.jsPlugins.find(
    (plugin) => typeof plugin === 'object' && plugin.name === pluginName,
  );
  if (typeof entry !== 'object') throw new Error('plugin entry missing');
  expect(
    existsSync(path.resolve(path.dirname(configPath), entry.specifier)),
  ).toBe(true);

  const configured = Object.entries(config.rules).filter(([key]) =>
    key.startsWith(`${pluginName}/`),
  );
  expect(
    configured.map(([key]) => key.slice(pluginName.length + 1)).toSorted(),
  ).toEqual(Object.keys(typeEvidence.rules).toSorted());
  // A rule left in the config but set to "off" enforces nothing.
  expect(configured.map(([, severity]) => severity)).toEqual(
    configured.map(() => 'error'),
  );
});
