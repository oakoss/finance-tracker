# Spec: Sync Module (BYO Credentials)

Status: draft
Epic: EPIC-29 (Sync)
Date: 2026-04-13

## Context

Users want bank-sync without the app paying an aggregator. ADR 0023
locks in a pluggable-adapter architecture where users bring their
own SimpleFIN / OFX / IMAP credentials. This spec defines the
module surface: data model, adapter interface, UX, and operational
details.

**Prerequisite work (sequenced before this module):**

- Payees module extracted out of `transactions/` into its own
  `src/modules/payees/` module (the `payees`, `tags`,
  `transaction_tags`, and `split_lines` tables exist today in
  `src/modules/transactions/db/schema.ts`; extraction is a move,
  not a new build). Tracked alongside TREK-57 (Payees CRUD).
- Rules module UI shipped (merchant rules, recurring rules, payee
  aliases) so imported transactions get auto-categorized.
- Transfers module UI shipped so cross-account pairs are matched
  before landing in budget totals.

## Scope

**In scope:**

- `sync` module: data model, adapter interface, normalize layer,
  scheduled polling via Nitro tasks, manual "refresh now".
- Three adapters: SimpleFIN (first), OFX (second), IMAP (third).
- Per-user provider configuration with envelope-encrypted
  credential storage.
- Settings page "Sync" tab: list providers, add/remove, test
  connection, trigger refresh, view last run status.
- Import pipeline integration: normalized transactions flow through
  existing rules / transfer-detection / dedup before appearing in
  the user's ledger.

**Out of scope:**

- Plaid / MX / GoCardless adapters (future adapters once base
  module ships).
- Live push notifications from providers (webhooks).
- Investment holdings sync (transactions only for v1).
- Real-time balance updates (daily polling only).
- Browser-extension-based sync.

## User flows

### Flow 1: Connect a SimpleFIN account

1. User opens Settings → Sync tab.
2. Clicks "Add provider" → picks SimpleFIN from the list.
3. App shows a step-by-step guide linking to
   `bridge.simplefin.org`, where the user connects their bank and
   gets a setup token.
4. User pastes the setup token; app exchanges it for an access URL
   (one-time SimpleFIN step) and stores the encrypted access URL.
5. App runs an initial sync, maps SimpleFIN accounts → existing
   `ledger_accounts` (user confirms mapping for each), and imports
   transactions through the rules pipeline.
6. Settings page shows "Last synced: X minutes ago" with a
   "Refresh now" button.

### Flow 2: Scheduled daily sync

1. Nitro task runs once per day (configurable per provider).
2. For each active provider config, the worker decrypts
   credentials, calls `adapter.poll(since)` with the last-run
   watermark, and receives normalized transactions.
3. Each transaction is deduped against existing rows (provider
   txn ID + account + amount + date fingerprint) then pushed
   through the rules pipeline.
4. A `sync_runs` row records status, transaction counts, and any
   error.
5. On error: user gets a toast on next login plus an email if
   configured. Run-level details live in the Sync settings page.

### Flow 3: Disconnect a provider

1. User clicks "Disconnect" on a provider row.
2. Type-to-confirm dialog (per destructive-action convention).
3. Server function marks the provider `isActive = false`,
   `lastStatus = 'disconnecting'`. The route handler never decrypts
   credentials. UI shows "Disconnecting…".
4. The sync worker's regular pass picks up providers with
   `lastStatus = 'disconnecting'`, decrypts the config, calls
   `adapter.disconnect()` to revoke remote access where the
   protocol supports it, then soft-deletes the `sync_providers`
   row. Imported transactions stay in the ledger.
5. For providers with no remote-revoke call (e.g., SimpleFIN), the
   worker soft-deletes locally and surfaces a "revoke manually at
   …" hint in the UI.
6. Disconnect latency is bounded by the worker's tick interval
   (default 1 hour). Users who need faster feedback can pair this
   with a manual "refresh now" trigger that also processes
   disconnecting providers.

## Data model

### `sync_providers`

One row per active provider connection per user.

| Column                 | Type      | Notes                                                                                                      |
| ---------------------- | --------- | ---------------------------------------------------------------------------------------------------------- |
| `id`                   | uuid (v7) | PK                                                                                                         |
| `userId`               | uuid      | FK → `users.id` cascade                                                                                    |
| `kind`                 | enum      | `simplefin`, `ofx`, `imap`                                                                                 |
| `label`                | text      | User-visible name ("Chase checking OFX")                                                                   |
| `encryptedConfig`      | bytea     | libsodium secretbox ciphertext of the provider config, encrypted with the wrapped DEK below                |
| `encryptedConfigNonce` | bytea     | nonce for `encryptedConfig`                                                                                |
| `wrappedDataKey`       | bytea     | Per-row 32-byte data-encryption key (DEK), wrapped with the application master key via libsodium secretbox |
| `wrappedDataKeyNonce`  | bytea     | nonce for `wrappedDataKey`                                                                                 |
| `masterKeyId`          | text      | key id ("kid") of the master key used to wrap the DEK; supports overlapping keys during rotation           |
| `pollCadenceHours`     | integer   | Default 24                                                                                                 |
| `lastSyncedAt`         | timestamp | Nullable until first run                                                                                   |
| `lastStatus`           | enum      | `ok`, `error`, `running`, `pending`, `disconnecting`                                                       |
| `isActive`             | boolean   | Default true; false pauses polling                                                                         |
| `auditFields`          | mixin     | createdBy/updatedBy/deletedBy/at                                                                           |

Indexes: `(userId)`, partial `(isActive) WHERE isActive = true`.

### `sync_runs`

One row per poll attempt per provider. Used for debugging and
surfacing errors.

| Column                 | Type      | Notes                                 |
| ---------------------- | --------- | ------------------------------------- |
| `id`                   | uuid (v7) | PK                                    |
| `providerId`           | uuid      | FK → `sync_providers.id` cascade      |
| `startedAt`            | timestamp | When the run began                    |
| `finishedAt`           | timestamp | Nullable while running                |
| `status`               | enum      | `ok`, `error`, `running`, `canceled`  |
| `transactionsImported` | integer   | Count, default 0                      |
| `transactionsSkipped`  | integer   | Dedupe hits, default 0                |
| `errorMessage`         | text      | Nullable                              |
| `errorCode`            | text      | Nullable; stable codes for UI mapping |

Indexes: `(providerId, startedAt DESC)`.

### `sync_account_mappings`

Maps a provider's remote account identifier to a local
`ledger_accounts` row. Without this, the same bank account
duplicates across providers.

| Column            | Type      | Notes                             |
| ----------------- | --------- | --------------------------------- |
| `id`              | uuid (v7) | PK                                |
| `providerId`      | uuid      | FK → `sync_providers.id` cascade  |
| `remoteAccountId` | text      | Provider-owned ID                 |
| `ledgerAccountId` | uuid      | FK → `ledger_accounts.id` cascade |
| `auditFields`     | mixin     |                                   |

Unique index: `(providerId, remoteAccountId)`.

### New columns on `transactions`

| Column                | Type            | Notes                             |
| --------------------- | --------------- | --------------------------------- |
| `sourceProviderId`    | uuid (nullable) | FK → `sync_providers.id` set null |
| `remoteTransactionId` | text (nullable) | Provider-owned ID, for dedup      |

Unique partial index on `(sourceProviderId, accountId, remoteTransactionId) WHERE remoteTransactionId IS NOT NULL` for O(1) dedup. `accountId` (existing FK → `ledger_accounts.id`) is in the key because some adapters issue transaction IDs that are only unique within an account; scoping the index by both provider and account prevents legitimate collisions across accounts on the same provider.

## API surface

Server functions live in `src/modules/sync/api/`. All wrap the
service layer (`src/modules/sync/services/`) which owns the
adapter dispatch and transaction handling.

```ts
// src/modules/sync/services/adapter.ts
export type SyncAdapter<Config> = {
  kind: SyncProviderKind;

  validateConfig(raw: unknown): Config;

  testConnection(
    ctx: AdapterCtx,
    config: Config,
  ): Promise<
    { ok: true; accounts: RemoteAccount[] } | { ok: false; error: string }
  >;

  listAccounts(ctx: AdapterCtx, config: Config): Promise<RemoteAccount[]>;

  poll(
    ctx: AdapterCtx,
    config: Config,
    opts: { since?: Date; accountIds?: string[] },
  ): Promise<NormalizedTransaction[]>;

  disconnect(ctx: AdapterCtx, config: Config): Promise<void>;
};

export type AdapterCtx = {
  userId: string;
  log: typeof log;
  // Network client, secrets — injected rather than imported
};

export type RemoteAccount = {
  remoteId: string;
  name: string;
  kind: 'depository' | 'credit' | 'loan' | 'investment' | 'other';
  currency: string;
  balanceCents: number | null;
};

export type NormalizedTransaction = {
  remoteId: string;
  remoteAccountId: string;
  amountCents: number;
  postedAt: Date;
  rawDescription: string;
  memo?: string;
  pending?: boolean;
};
```

Server functions (subset):

- `listProviders()` — GET, user's providers with last-run summary.
- `addProvider(input)` — POST, validates config via adapter,
  encrypts, stores, triggers initial sync.
- `updateProvider(id, patch)` — POST, label, pollCadenceHours,
  isActive.
- `disconnectProvider(id)` — POST, flips `isActive = false` and
  `lastStatus = 'disconnecting'`. Never decrypts credentials in the
  route handler; the next worker tick runs `adapter.disconnect()`
  and soft-deletes the row.
- `refreshNow(id)` — POST, enqueues a one-off sync run.
- `mapAccount(providerId, remoteAccountId, ledgerAccountId)` —
  POST, creates `sync_account_mappings` row.
- `listRuns(providerId, { limit })` — GET.

Validators in `validators.ts` follow project conventions (ArkType,
single source of truth, `.pick()` for forms).

## UI

### Settings → Sync tab

- Empty state: brief explainer, "Add provider" CTA, links to a
  docs page describing each adapter and how to get credentials.
- Populated state: one row per provider:
  - Kind icon + label
  - Last-synced timestamp
  - Status badge (ok / error / running / paused)
  - "Refresh now" / "Edit" / "Disconnect" actions
  - Expandable panel showing the last 5 runs + account mappings
- Add-provider dialog: picker → per-kind guided form (SimpleFIN
  needs a setup token, OFX needs bank URL + creds, IMAP needs
  server/user/app-password + folder filter).

### Transactions list

- Imported transactions show a small provider badge ("SimpleFIN",
  "OFX", "IMAP") on the row.
- Filter option: "Source: manual / imported (CSV) / synced".

## Edge cases

- **Provider returns duplicate `remoteId`** (same transaction twice
  in consecutive runs): unique index on
  `(sourceProviderId, remoteTransactionId)` deduplicates at insert.
- **Provider reassigns `remoteId`** (rare but happens on
  re-connections): fuzzy dedup on `(account, amount, postedAt ±
3d, rawDescription similarity)` flags the collision; user
  resolves in a "Possible duplicate" queue.
- **Bank account not yet mapped**: initial sync pauses import of
  its transactions and surfaces a "Map account" prompt in the
  Sync tab. Transactions land once mapping is saved.
- **Credentials expire / revoked remotely**: adapter surfaces
  `errorCode: 'auth_expired'`. UI shows a "Reconnect" banner and
  pauses polling until fixed.
- **Rate limit hit**: adapter returns `errorCode: 'rate_limited'`
  with a `retryAfterSeconds` hint; scheduler backs off.
- **Pending transactions**: imported with `pending: true`, then
  upserted as posted once the provider marks them settled.
- **Self-hosted: `SYNC_ENCRYPTION_KEY` missing**: app refuses to
  start the sync worker and logs an actionable error (missing
  env var is a deploy misconfig, not a runtime edge case).
- **Transfer detection across providers**: normalize layer flags
  candidate transfer pairs (opposite-sign same-amount within
  small date window) for the transfers module to confirm.

## Open questions

- **Account mapping UX**: auto-map by name similarity with user
  confirmation vs. always manual? Auto-map is nicer but can
  mis-match similarly-named accounts.
- **Revocation of SimpleFIN access URL**: the SimpleFIN protocol
  doesn't provide a remote-revoke call. Disconnect locally and
  tell the user to revoke at `bridge.simplefin.org`. Documented
  or inlined in disconnect confirmation?
- **Historical backfill depth**: how far back do we pull on
  initial sync? 90 days? All-available? Provider-dependent; make
  it a per-adapter default with a user override in settings.
- **Encryption key rotation**: `masterKeyId` is already in the
  schema so v1 can ship with a single master key and add
  overlapping keys later without a migration. Rotation workflow
  (re-wrap all DEKs under a new master key, drop the old one)
  is out of scope for v1 and will be its own spec.
- **IMAP parser per-bank templates**: different banks format alert
  emails differently. Start with a small library (Chase, BofA,
  Capital One, Amex) and let users contribute templates? Decide
  at IMAP-adapter task time.
