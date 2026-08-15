import { definePlugin, defineRule, type ESTree } from '@oxlint/plugins';

const FORBIDDEN_TYPE_NAME_TERM = 'shape';

/** Key types that never carried literal evidence and stay indexable at runtime. */
const OPEN_KEY_TYPES: ReadonlySet<ESTree.TSType['type']> = new Set([
  'TSAnyKeyword',
  'TSNumberKeyword',
  'TSStringKeyword',
  'TSSymbolKeyword',
  'TSTemplateLiteralType',
  'TSUnknownKeyword',
] satisfies ESTree.TSType['type'][]);

function isOpenKeyType(key: ESTree.TSType): boolean {
  if (OPEN_KEY_TYPES.has(key.type)) return true;
  // One open member widens the whole union back to an indexable key.
  if (key.type === 'TSUnionType') return key.types.some(isOpenKeyType);
  // `keyof any` is string | number | symbol.
  if (key.type === 'TSTypeOperator') {
    return (
      key.operator === 'keyof' && key.typeAnnotation.type === 'TSAnyKeyword'
    );
  }
  return (
    key.type === 'TSTypeReference' &&
    key.typeName.type === 'Identifier' &&
    key.typeName.name === 'PropertyKey'
  );
}

/**
 * Match `shape` as a whole word so `UserShape` and `USER_SHAPE` are caught
 * while `Reshaped` — which merely contains the letters — is not.
 */
function namesShape(name: string): boolean {
  const words = name.match(/[A-Z]+(?![a-z])|[A-Z][a-z]*|[a-z]+|\d+/g) ?? [];
  return words.some((word) => word.toLowerCase() === FORBIDDEN_TYPE_NAME_TERM);
}

type AssertionExpression = ESTree.TSAsExpression | ESTree.TSTypeAssertion;

function isAssertion(node: ESTree.Node): node is AssertionExpression {
  return node.type === 'TSAsExpression' || node.type === 'TSTypeAssertion';
}

type ChainLink = ESTree.TSNonNullExpression | ESTree.TSSatisfiesExpression;

function isChainLink(node: ESTree.Node): node is ChainLink {
  return (
    node.type === 'TSNonNullExpression' || node.type === 'TSSatisfiesExpression'
  );
}

/** Step past wrappers that sit between two assertions without ending the chain. */
function unwrapChainLinks(expression: ESTree.Expression): ESTree.Expression {
  let current = expression;
  while (isChainLink(current)) current = current.expression;
  return current;
}

/** True when nothing encloses this assertion, so each chain reports once. */
function isOutermostAssertion(node: AssertionExpression): boolean {
  let current: ESTree.Node = node;
  let parent: ESTree.Node | null = node.parent;
  while (parent !== null && isChainLink(parent)) {
    current = parent;
    parent = parent.parent;
  }
  return (
    parent === null || !isAssertion(parent) || parent.expression !== current
  );
}

/** Two or more stacked assertions, laundering a value toward an unrelated type. */
function isLaunderingChain(node: AssertionExpression): boolean {
  let depth = 0;
  let current: ESTree.Expression = node;
  while (isAssertion(current)) {
    depth += 1;
    current = unwrapChainLinks(current.expression);
  }
  return depth > 1;
}

const noChainedTypeAssertions = defineRule({
  createOnce(context) {
    const checkAssertion = (node: AssertionExpression) => {
      if (!isOutermostAssertion(node) || !isLaunderingChain(node)) return;
      context.report({ messageId: 'chained', node });
    };

    return { TSAsExpression: checkAssertion, TSTypeAssertion: checkAssertion };
  },
  meta: {
    docs: {
      description:
        'Disallow stacked type assertions, which launder a value through a wider type to reach an unrelated one.',
    },
    messages: {
      chained:
        'This assertion chain discards the original type. Keep the precise type, or parse the value at its boundary before narrowing.',
    },
    type: 'problem',
  },
});

const noKnownValueWidening = defineRule({
  createOnce(context) {
    return {
      VariableDeclarator(node) {
        if (node.init?.type !== 'ObjectExpression') return;
        // An empty literal is an accumulator: the annotation is the only contract
        // it has, and there are no known keys for it to discard.
        if (node.init.properties.length === 0) return;
        if (node.id.type !== 'Identifier') return;
        // On a reassignable binding the annotation is the declared type, so
        // `satisfies` is not an equivalent fix.
        if (node.parent.type !== 'VariableDeclaration') return;
        if (node.parent.kind !== 'const') return;

        const annotation = node.id.typeAnnotation?.typeAnnotation;
        if (annotation === undefined) return;
        if (annotation.type !== 'TSTypeReference') return;
        if (annotation.typeName.type !== 'Identifier') return;
        if (annotation.typeName.name !== 'Record') return;

        // An open key was never constrained, so there is no key evidence to
        // discard — and these maps get indexed by a runtime value, which
        // `satisfies` would break. Only literal-union keys carry evidence.
        const [key] = annotation.typeArguments?.params ?? [];
        if (key === undefined || isOpenKeyType(key)) return;

        context.report({
          data: { name: node.id.name },
          messageId: 'widened',
          node: annotation,
        });
      },
    };
  },
  meta: {
    docs: {
      description:
        'Disallow annotating an object literal with an open Record type, which discards the literal key evidence.',
    },
    messages: {
      widened:
        'The Record annotation on `{{name}}` discards its known keys. Use `satisfies` to keep inference while still checking the shape.',
    },
    type: 'problem',
  },
});

const noShapeInTypeNames = defineRule({
  createOnce(context) {
    const reportForbiddenName = (
      node: ESTree.TSInterfaceDeclaration | ESTree.TSTypeAliasDeclaration,
    ) => {
      const { id } = node;
      if (!namesShape(id.name)) return;
      context.report({
        data: { name: id.name },
        messageId: 'forbiddenName',
        node: id,
      });
    };

    return {
      TSInterfaceDeclaration: reportForbiddenName,
      TSTypeAliasDeclaration: reportForbiddenName,
    };
  },
  meta: {
    docs: {
      description:
        'Disallow "shape" in type names, which describes structure rather than the domain role the type plays.',
    },
    messages: {
      forbiddenName:
        'Rename `{{name}}` for the domain role it plays; "shape" describes structure and tells callers nothing.',
    },
    type: 'problem',
  },
});

/** Local rules rejecting TypeScript patterns that assert type safety without evidence for it. */
export default definePlugin({
  meta: { name: 'type-evidence' },
  rules: {
    'no-chained-type-assertions': noChainedTypeAssertions,
    'no-known-value-widening': noKnownValueWidening,
    'no-shape-in-type-names': noShapeInTypeNames,
  },
});
