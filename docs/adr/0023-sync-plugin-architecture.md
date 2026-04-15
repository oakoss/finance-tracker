# ADR 0023: Pluggable Sync Adapters (BYO Credentials)

Date: 2026-04-13
Status: Accepted
Tracking: EPIC-29 (Sync)

## Context

Users want bank-sync ("connect my accounts and pull transactions
automatically") without the app maintainer signing a Plaid or MX
contract. Research (`docs/research/0005-copilot-comparison.md`) showed
that the major US consumer finance apps all delegate to a paid
aggregator (Plaid, MX, Finicity) and pass the cost along via
subscription pricing or drop the feature entirely.

The BYO-credentials model lets users bring their own credentials to
free or user-paid providers: SimpleFIN Bridge ($1.50/acct/yr, paid by
the user), GoCardless Bank Account Data (free EU/UK open banking),
OFX Direct Connect (free, specific US banks), and email/IMAP parsing
(universal fallback). The maintainer never signs an aggregator
contract; the app code owns only the adapter layer.

Because this app is open-source and supports both hosted and
self-hosted deployment, the architecture must accommodate both:

- **Hosted**: credentials stored encrypted at rest in the app's
  database; a single operator manages infrastructure.
- **Self-hosted**: user runs the app themselves and holds their own
  keys; operator == user.

## Decision

- Introduce a new `sync` module (`src/modules/sync/`) that owns a
  pluggable `SyncAdapter` interface, per-user provider
  configuration, scheduled polling, and transaction normalization.
- Ship adapters as independent files under `services/adapters/`,
  each implementing the same interface. Adding a new provider is a
  single-file addition plus tests.
- **First adapter: SimpleFIN Bridge.** Best US coverage-to-effort
  ratio; user pays SimpleFIN directly; protocol is stable and
  documented.
- **Second adapter: OFX Direct Connect.** Free where supported;
  uses `ofxtools`-class lib; user provides bank credentials.
- **Third adapter: IMAP email alert parsing.** Universal fallback
  for transactions-only visibility; user provides IMAP credentials.
- CSV import stays separate as a manual ingress; it already lives
  in the `imports` module.
- Credentials are **envelope-encrypted at rest** using libsodium
  `crypto_secretbox`. Each `sync_providers` row carries its own
  32-byte data-encryption key (DEK); the DEK is wrapped with the
  application master key and stored alongside the ciphertext,
  together with a `masterKeyId` ("kid") so overlapping keys work
  during rotation. The master key is provided via the
  `SYNC_ENCRYPTION_KEY` env var (documented in the self-host
  deployment guide). Decryption happens only in the sync worker,
  never in route handlers. Operations that need decrypted creds
  (initial sync, poll, disconnect) run inside the Nitro task; route
  handlers only flip state on the `sync_providers` row and let the
  next worker tick pick the work up.
- Scheduled polling uses **Nitro tasks** (already adopted for
  another feature). Default cadence: daily per provider, with
  per-provider cooldowns to respect rate limits. A "refresh now"
  button triggers an immediate run.
- Imported transactions flow through the existing rules pipeline
  (auto-categorize, dedup, transfer-detect) before they land in
  the user-visible transactions list. This depends on the rules +
  transfers + payees modules shipping first (sequenced after those
  in the Trekker backlog).

## Alternatives Considered

- **Single Plaid integration.** Fastest to build and broadest US
  coverage, but requires the app maintainer to sign Plaid's
  contract and pay per-account fees. Conflicts with the OSS and
  self-host positioning. Also legally gray to let users BYO Plaid
  keys into a hosted instance.
- **CSV-only forever.** Simple and already shipped. Rejected
  because it forfeits an entire feature class that competing apps
  consider table-stakes; users still want sync for active accounts.
- **One hardcoded provider (SimpleFIN only).** Simpler than
  pluggable adapters, but the moment a second adapter is wanted
  (OFX, IMAP, GoCardless, future CFPB 1033 APIs) it's a broad
  refactor. The adapter seam costs little up-front.
- **Browser extension that scrapes bank sites.** Sidesteps
  server-side credentials but is fragile, legally dubious, and
  re-implements what MX/Plaid already do.

## Consequences

- **Positive**: zero aggregator contract, zero marginal cost per
  user, users choose the provider that fits their region/bank/
  cost tolerance. New adapters are additive. Forward-compatible
  with CFPB 1033 APIs if they eventually ship as a free tier.
- **Positive**: self-hosted users own their data end-to-end; hosted
  users get the same adapter surface with operator-managed
  encryption.
- **Negative**: no single provider covers every user's banks. The
  settings flow must surface the tradeoffs so users pick the right
  one.
- **Negative**: holding bank-adjacent credentials (SimpleFIN tokens,
  OFX creds, IMAP creds) raises operator liability in hosted
  deployments. Mitigated by envelope encryption, a narrow decrypt
  surface, and deployment documentation covering key management.
- **Follow-ups**: `docs/specs/0001-sync-module.md` defines data
  model, adapter interface, and UX. Rules, transfers, and payees
  modules must ship UI first (already in the Trekker backlog).
  CFPB 1033 status should be revisited Q4 2026 per the research
  doc.
