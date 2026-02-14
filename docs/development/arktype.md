# ArkType

Use ArkType for runtime validation and precise TypeScript inference.
We primarily use it via `drizzle-arktype` for DB schemas.

## Object Keys

```ts
import { type } from 'arktype';

const User = type({
  id: 'string.uuid',
  name: 'string',
  email: 'string.email',
  isAdmin: 'boolean',
});

const UserKeys = User.keyof();
```

## Pick / Omit

```ts
import { type } from 'arktype';

const User = type({
  id: 'string.uuid',
  name: 'string',
  email: 'string.email',
  isAdmin: 'boolean',
});

const UserPublic = User.omit('email');
const UserIdentifier = User.pick('id');
```

## Optional Fields

```ts
import { type } from 'arktype';

const Preferences = type({
  'timezone?': 'string',
  'locale?': 'string',
});
```

Notes:

- Optional keys use `?` (e.g., `'timezone?'`).
- Optional does not allow `undefined` unless you include it in the value.
