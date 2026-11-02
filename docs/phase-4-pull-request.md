# Phase 4: Image Generation and Variations

Implements Image Studio and a private asset gallery in the existing design. Users select exact character/scene versions, 1/2/4/8 results, aspect ratio, mock provider/model and seed; inspect assembled prompts/continuity; then submit durable background work. Results are clearly labeled original deterministic MOCK geometric test patterns, not AI influencer photography. Source-based mock variations preserve originals and provenance.

PostgreSQL Generation/result slots/transactional outbox are the source of truth. A separate Redis/BullMQ dispatcher/worker supports status/progress, duplicate delivery, stalled-job recovery, fenced leases, bounded per-slot attempts, partial results, failed-slot retries and eligible cancellation. Project-scoped idempotency and serializable quotas prevent duplicate requests and overbooking. Paid providers are disabled; cost/quota ports are prepared without live billing.

Favourite/Reject, actual private PNG download, generation details, character/scene links, source variations, gallery filters and older batches work. Collections/editing/full version trees are not implemented and have no fake controls. Composite foreign keys and server authorization protect references and private assets; existing immutable character/scene snapshots and old migrations remain intact.

Validation: locked install, 43 unit tests, 30 PostgreSQL/Redis integration tests (including a real killed-worker recovery), 16 desktop/mobile browser tests, production build and production credential/session rejection. Corrected native CI: https://github.com/Benzmaks/ai-influencer-studio/actions/runs/41415547867 (verify actual conclusion). See docs/phase-4-validation.md for exact browser/hosted outcomes, earlier corrected failures and the remaining local WASM migration limitation. Prisma adapter is aligned to client/CLI 6.19.3; native migration/runtime remains the supported release/CI path.

A source-pinned private Monterey updater backs up existing data and adds local password-protected Redis plus automatic worker start/stop without Docker. It may require Apple's Command Line Tools for compiling official checksum-verified Redis source. Physical Mac execution/restore remains unverified here.

Review docs/image-generation.md, docs/development.md and docs/phase-4-validation.md. Do not merge automatically or begin Phase 5.
