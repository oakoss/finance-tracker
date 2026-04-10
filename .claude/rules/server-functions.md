---
paths:
  - src/routes/**/*
  - src/modules/*/api/**/*
---

# Server Function Pattern

Server functions use `createServerFn` from `@tanstack/react-start`:

```ts
const getData = createServerFn({ method: 'GET' }).handler(async () => {
  const result = await db.query.table.findMany();
  log.info({ action: 'entity.list', outcome: { count: result.length } });
  return result;
});

const createData = createServerFn({ method: 'POST' })
  .inputValidator((data: { name: string }) => data)
  .handler(async ({ data }) => {
    try {
      await db.insert(table).values(data);
      log.info({ action: 'entity.create', outcome: { success: true } });
      return { success: true };
    } catch (error) {
      throw createError({
        cause: error instanceof Error ? error : new Error(String(error)),
        fix: 'Check the database connection and try again.',
        message: 'Failed to create entity.',
        status: 500,
        why: error instanceof Error ? error.message : String(error),
      });
    }
  });
```

- Use `.inputValidator()` for request validation.
- Use `createError()` from `@/lib/logging/evlog` for structured errors with `message`, `status`, `why`, `fix`, `cause`.
- Log with `log.info()` using `action`/`outcome` structure.
- Route loaders call server functions for SSR data: `loader: async () => await getData()`.
- Client-side mutation: call server function, then `void router.invalidate()` to refetch.
- **`api/` files contain only `createServerFn` definitions and type re-exports.** TanStack Start strips the `.handler()` body on the client, but plain sibling exports survive bundling and pull their imports (db, `node:crypto`, etc.) into the browser. Anything that needs to be callable directly (tests, other server code) lives in `services/` and is imported by the api file.
