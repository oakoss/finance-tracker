# SEO

SEO configuration for the TanStack Start app.

See `docs/adr/0006-deployment-coolify-cloudflare-tunnel.md` for the
canonical domain (`finance.oakoss.dev`).

## Current state

The root route (`src/routes/__root.tsx`) sets global meta via `head()`:

```ts
head: () => ({
  links: [{ href: globalsCss, rel: 'stylesheet' }],
  meta: [
    { charSet: 'utf8' },
    { content: 'width=device-width, initial-scale=1', name: 'viewport' },
    { title: appConfig.name },
  ],
}),
```

`<HeadContent />` renders these tags inside `<head>`.

No per-route `head()` overrides exist yet. Child routes inherit the root
title.

## Per-route meta

Add `head()` to any `createFileRoute` call to set page-specific titles
and descriptions:

```ts
export const Route = createFileRoute('/_app/accounts')({
  head: () => ({
    meta: [
      { title: 'Accounts | Finance Tracker' },
      { content: 'Manage your financial accounts', name: 'description' },
    ],
  }),
});
```

## Robots

`public/robots.txt` currently allows all crawlers:

```text
User-agent: *
Disallow:
```

Authenticated routes (`/_app/*`) are not exposed to crawlers because
they require login; no explicit `Disallow` is needed.

## Sitemap

No sitemap generation exists yet. Add `sitemap.xml` as a Nitro route
when public pages ship. Only include public routes.

## Manifest

`public/manifest.json` exists but still contains TanStack boilerplate
values. Update the `name`, `short_name`, and icons when the brand
identity is finalized (TREK-72). Link it from the root `head()`.

## Planned work

- Add Open Graph and Twitter card meta to public pages
- Set canonical URLs on public routes
- Update manifest with real app name and icons
- Generate a sitemap for public pages
