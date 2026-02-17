# Uploads

Planned approach for statement uploads (CSV first).

## Current state

- `useFileUpload` hook exists at `src/hooks/use-file-upload.ts`.
- No upload UI components have been implemented yet (update this once
  `src/components/ui/file-upload` exists).
- CSV is the primary import format (see `docs/adr/0013-csv-first-import.md`).

## Planned UX

- Primary: Table Upload for CSV statements.
- Secondary: Compact Upload for receipts.
- Optional: Progress indicators per file and a completion toast.

## Planned data model (not implemented)

Proposal only; update once migrations are added.

- `upload_jobs`: tracks a batch upload job and aggregate progress.
- `upload_files`: tracks per-file status, progress, and errors.
- Final artifacts should create `statements` and `attachments` records.
  `statements` and `attachments` already exist; `upload_jobs`/`upload_files`
  are the missing pieces.
  `imports`/`import_rows` already exist for CSV imports and are separate from
  the planned upload job tables.

## Planned flow (TanStack Start)

1. Create upload job and record files.
2. Process CSV in the background and update progress.
3. Client polls job status while processing.
4. Inline table shows per-file status + progress.
5. Toast on completion.

## Next tasks

- Add upload job schemas + migrations.
- Add `src/components/ui/file-upload` patterns (Table Upload + Compact Upload).
- Add server functions for job creation and status polling.
