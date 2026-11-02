# Architecture

Status: Phase 1 application, database, development authentication, mock ports and CI configuration are implemented. Generation workers and later modules below remain architectural plans. See [development.md](development.md) for actual commands and compatibility decisions. The complete original requirements are preserved verbatim in [product-specification.md](product-specification.md). This design also incorporates the subsequent documentation-milestone requirements. Phase boundaries and gates are in [implementation-plan.md](implementation-plan.md).

## Stack and runtime boundaries

- Next.js App Router and TypeScript for the responsive web application and server endpoints. Use the Node.js runtime for database, filesystem and queue operations.
- PostgreSQL and Prisma for normalized relational persistence, schema migrations and typed access. Flexible DNA and provider metadata may use schema-validated JSON; ownership, foreign keys, statuses and other queried fields remain relational.
- Redis and BullMQ for asynchronous work. A separately started TypeScript worker consumes queued jobs; expensive provider calls never execute inside a page render or long-lived HTTP request.
- Local development storage behind a StorageProvider interface; an S3-compatible production adapter stores originals and derived objects privately.
- Server-side language, image and video provider adapters, selected through a registry. Mock adapters are the default and require no paid credentials.
- Auth.js is the proposed authentication integration. Phase 1 uses a development-only credentials adapter with securely hashed seeded credentials and signed sessions; a production OIDC provider must be selected and validated before deployment. Development credentials must fail closed in production.

Dependencies and the npm lockfile are pinned. The native Prisma default, isolated experimental development path and Auth.js beta are documented in [development.md](development.md); production approval remains a separate gate.

## Application modules

Use framework conventions: `app/` for routes/layouts, `components/` for shared presentation, `features/` for domain features, `lib/` for cross-cutting services, `ai/` for orchestration and provider adapters, `database/` for Prisma/schema support, `workers/`, `storage/`, `docs/` and `tests/`. Do not create empty directory trees merely to match this proposal.

| Module              | Responsibility                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Projects and access | Membership, project selection, authorization and scoped queries                               |
| Characters          | Guided choices, Character DNA, Visual Bible, Brand DNA, Realism DNA and Social Voice          |
| Scenes              | Structured concepts, camera/lighting, versioned overrides and continuity decisions            |
| Prompts             | Deterministic positive/negative prompt composition with versioned rules                       |
| Generations         | Provider selection, capabilities, idempotency, batch orchestration and cost-sensitive retries |
| Images and videos   | Generation/edit requests, variations, comparisons, storyboards and source references          |
| Assets              | Private objects, metadata, favorites, tags, collections, comparison and version lineage       |
| Content             | Character voice, posts, captions, asset references and calendar state                         |
| Automations         | Versioned workflow definitions and execution of authorized domain actions                     |

The primary navigation contains Dashboard, Characters, Scenes, Images, Videos, Content, Assets, Automations and Settings. Project selection is available in the shell. Unimplemented screens explicitly say “Planned”; they must not imply that generation, scheduling or publishing works. The interface uses responsive cards, grids, wizards, metadata panels and progress indicators, rather than a chat-first layout.

## Service boundaries and request flow

UI → authenticated server endpoint/action → input validation → project authorization → domain service → repository/storage/queue/provider ports. UI components never construct provider requests, access credentials, or define authorization policy. Shared domain services enforce permissions for every entry point, including an eventual creative assistant.

Generation flow:

1. Authorize the project and every referenced character, scene and source asset.
2. Resolve immutable character and scene versions; validate continuity and explicit overrides.
3. Build and store a deterministic prompt snapshot, rule version and generation parameters.
4. In one database transaction create a generation, job and transactional outbox record, protected by a project-scoped idempotency key and request hash.
5. Dispatch the outbox entry to BullMQ using the database job ID as the stable queue identity. A reconciler retries dispatch after crashes.
6. Worker claims the job through guarded state transitions, revalidates membership/references, checks capabilities and invokes the adapter.
7. Store validated output in private storage and atomically link assets/results to the generation. Record failures without deleting the request or original inputs.
8. UI polls an authorized job endpoint initially; add server-sent events only if useful. A process or open port alone never proves readiness.

PostgreSQL is the source of truth for job state and generation history. Redis queue state is recoverable, not the sole record of a request. Jobs use queued, processing, completed, failed and cancelled states. Cancellation is best effort for dispatched remote work; disclose when provider cost may already have occurred. Progress is nullable when the provider cannot report it.

## Canonical identity and continuity

Characters point to a current immutable CharacterVersion containing Character DNA, Visual Bible, Brand DNA, Realism DNA, Social Voice and image profile. Signature imperfections are persistent identity anchors; realism level changes do not silently remove them or add excessive imperfections. The five realism levels retain the source specification's names.

Scenes likewise point to immutable SceneVersions. Generations reference exact character and scene versions, never a mutable “latest” lookup during execution. Semi-permanent changes may be recorded as scene-local overrides. Immutable identity conflicts must require an explicit decision: retain canonical values, use a scene-specific override, or create a new character version. Overrides never mutate the referenced canonical snapshot. A permanent update creates a version and moves the current pointer; earlier generations retain their history. Even a requested identity change is recorded as a reviewed version rather than silently rewriting identity.

Continuity returns compatible, warning or conflict with structured affected fields. The realism engine, dynamic negative rules and prompt engine are separate testable modules. Prompts are deterministic for identical snapshots, rule versions, parameters and explicit seeds. Providers may remain nondeterministic; reproducible request metadata does not guarantee identical pixels.

## Provider and storage contracts

LanguageModelProvider supports structured character, scene, storyboard and content operations with validated results. ImageProvider exposes generate, edit and createVariations. VideoProvider exposes generation plus optional image/reference input, edit and extension operations. Capability metadata covers supported operations, models, variation limits, sizes and duration/input constraints. Unsupported controls are hidden or explained as unavailable, and server validation rejects unsupported requests too.

Adapters translate common requests into provider formats, normalize errors, sanitize returned metadata, and never expose secrets. Mock language, image and video adapters simulate asynchronous success, progress, cancellation and controlled failures and return clearly labeled sample assets. They validate the same contracts as real adapters and never claim real generation quality.

StorageProvider exposes private put/read/delete operations and authorized download handling. Object keys are generated server-side, project namespaced and independent of user paths. Local development uses an ignored persistent directory; production uses private S3-compatible objects and short-lived download URLs. Validate upload size, MIME signature, supported formats and processing limits; reject path traversal and untrusted remote-fetch URLs. Store storage keys and checksums in the database, not expiring URLs. Originals remain untouched; edits and variations produce new assets with parent edges and complete generation metadata.

## Reliability and security

Paid operations require project-scoped idempotency keys with payload hashes; reuse with a different request returns a conflict. Forward provider idempotency keys where supported. Default retry policy: at most three total attempts with exponential backoff and jitter for confirmed retryable errors. Never blindly resubmit after an ambiguous timeout: reconcile provider request IDs/status or flag for explicit recovery when reconciliation is unavailable. Rate limits, validation failures and authentication failures are classified separately. Store sanitized error codes/messages, attempt counts and timestamps. Redact credentials, signed URLs and sensitive headers from logs.

Every resource lookup and mutation must enforce project membership, including assets, job polling, downloads, exports and worker actions. Define owner/editor/viewer roles: owners manage membership/settings; editors create and change resources; viewers read permitted resources. Client-supplied project IDs confer no access. Maintain signed sessions, secure cookies, CSRF/origin protections, input validation and audit events for membership changes and permanent identity updates. Recheck access before work is dispatched and results are exposed. Secret values exist only in server/worker configuration, never browser bundles or persisted prompts.

## Deployment and unresolved choices

Development targets one web process, one worker, PostgreSQL, Redis and local storage. Production requires a Node-compatible web host, a persistent worker host, managed database/Redis, private S3-compatible storage, TLS, backups and secret management. Do not assume a serverless web deployment can host BullMQ workers or preserve local assets.

Before production select the OIDC provider and deployment host, initial paid providers/models, asset retention/deletion policy, quotas/budgets and operational backup targets. Initial mock development is not blocked by these choices. Repository contribution rules currently contain no direct-push restriction; server-enforced branch protection must still be respected.

## PR #1 compatibility review

The supported default now uses the aligned Prisma 6.19.3 CLI/client native engines, with no pg adapter at runtime or in migrations. Phase 4 aligns pg adapter 6.19.3 with Prisma client/CLI 6.19.3 for the local query-engine experiment; the WASM configuration remains forbidden in production and CI and cannot serve as the supported migration engine. See [phase-1-review.md](phase-1-review.md) for source evidence, the migration-preservation procedure and hosted CI findings. No migration SQL, data model ownership or historical snapshots were changed by this configuration review.

## Phase 2 character creator

The Character module now includes the ten-step creator, private resumable drafts, deterministic mock-language orchestration and seven canonical profile documents. Existing Phase 1 services and appearance remain; basic identity updates preserve DNA. Drafts have separate optimistic revisions and transactional publication. Permanent edits append immutable versions. Scene continuity and other later modules remain planned. See [character-system.md](character-system.md), [database.md](database.md) and [phase-2-validation.md](phase-2-validation.md).


## Phase 3 implementation

`features/scenes` validates choices and serves authorized scene repositories/transactions. `ai/continuity-engine`, `ai/realism-engine`, and separate positive/negative modules under `ai/prompt-engine` prepare deterministic labeled mock prompts from pinned Character DNA snapshots. `/scenes`, `/scenes/new` and `/scenes/[id]` replace the scene placeholder; image/video/job modules remain Planned. JSON snapshots live in PostgreSQL, not media storage. No worker or paid provider is introduced. See prompt-engine.md and ai-pipeline.md.


## Phase 4 image production

`features/generation` owns strict input validation, project-scoped CRUD, effective immutable request references, idempotency and transactional quotas/outbox creation. `workers/run.ts` runs BullMQ consumers and periodic PostgreSQL outbox repair outside HTTP. `workers/processor.ts` fences commits with durable leases, writes private storage and preserves successful slots through recovery/retry. `ai/mock-raster.ts` produces deterministic labeled PNG test patterns; real adapters remain disabled. Image/asset APIs enforce server authorization and checksum-verified downloads. See image-generation.md.

## Phase 5 editing and asset history

`ai/edit-engine` plans conservative mock edits and locks exact saved character references. `features/assets` provides project-scoped editor submission, byte-copy jobs, lineage validation, library search/filtering, comparisons and revision-guarded final selection. Existing generation/outbox/worker/storage boundaries remain in use; editing is not performed inside HTTP handlers. `/assets/[id]` and `/assets/compare` add the editor/tree and responsive comparison strip. AssetSelection is separate from immutable source bytes/metadata, and SQL triggers prevent lineage rewrites and invalid final candidates. See image-editing.md.
