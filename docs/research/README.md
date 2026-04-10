# Research

Prior art, community findings, and UX research.

Research docs capture what we learned from external sources so future
tasks don't re-discover the same things. They're written during
planning-phase research and persisted for the team.

## Conventions

- File naming: `NNNN-short-title.md`
- Keep findings concise: bullet points over prose.
- Cite sources where possible (links to Reddit threads, docs, etc.).
- Link to the spec or task that prompted the research.

## What belongs here

- Community pain points (what users complain about in competing apps)
- UX patterns from other apps (how YNAB, Monarch, etc. solve a problem)
- Library/framework behavior discoveries (Base UI quirks, Better Auth
  patterns, Drizzle edge cases)
- Performance benchmarks or comparisons

## What does NOT belong

- Decisions (those belong in ADRs)
- Feature designs (those belong in specs)
- Rough ideas (those belong in ideas/)

## Template

Use `docs/research/0000-template.md` for new research docs.

## Index

- `0001-profile-page-ux.md` — profile page patterns in finance apps
- `0002-base-ui-combobox-empty-state.md` — ComboboxEmpty requires
  items prop
- `0003-data-export.md` — data export patterns in finance apps
