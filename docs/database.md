# Database implementation

PostgreSQL/Prisma remain the existing Phase 1 foundation. The supported release/CI path uses aligned native Prisma 6.19.3 client and migration engines. The explicitly unsupported local WASM/adapter fallback remains development-only; see development.md and phase-1-review.md.

Phase 2 adds only `CharacterDraft` through `202611020002_character_drafts`. The original migration is unchanged. The new table has project/author foreign keys, an optional same-project target character plus base revision, validated answers JSON, current step, optimistic revision and completion/timestamps. Constraints enforce step 0–9, positive revision and paired target/base revision. An index supports active private drafts by project, creator and update time.

Existing CharacterVersion fields already support the immutable DNA snapshot. Phase 2 snapshots use schemaVersion 2 and include reviewed answers, seven profile documents and explicit mock provenance. Frequently displayed name/display name/age/location/occupation/background remain structured columns. No original rows are backfilled or rewritten; schema-version-1 identities remain readable.

Publication claims the exact active draft revision and appends the character/version in one transaction, with membership rechecked. Existing character updates also require the pinned active character revision. A conflict rolls back the draft claim and new version. The existing database snapshot update rule and current-version composite foreign key remain intact. No migrations use reset, db push or destructive replacement.

`npm run test:migrations` creates an isolated database, applies the original Phase 1 migration only, populates character snapshots and project membership, upgrades through all current migrations, then checks original row/migration preservation and repeated deployment. It also tests snapshot update prevention. Only the uniquely named disposable database and test-owned temporary configuration are removed; CREATE DATABASE privileges are required for this check.

Before applying to a populated local installation, stop the web app and take a private PostgreSQL dump and source/environment backup. Run db:generate and db:migrate, retaining existing migration history and credentials, then restart and validate the application. The Monterey preview updater automates these steps using the existing private cluster; backups remain local and must not be shared. No actual Mac backup restoration is claimed.

## Phase 3 scenes

`202611020003_scenes` adds project-shared Scene and immutable SceneVersion records. Exact character references use same-project composite foreign keys. Every draft/ready save appends a version in the transaction that advances Scene.revision; stale writes fail. Original character and draft tables/migrations are untouched. SQL blocks updating scene snapshots. See prompt-engine.md for persistence semantics and phase-3-validation.md for populated Phase 1/2 upgrade evidence.

## Phase 4 jobs and images

`202611020004_images` adds Generation, GenerationOutbox and ImageAsset and a unique SceneVersion reference index without rewriting old migrations or snapshots. Generation pins same-project exact scene and character versions and stores an immutable effective input snapshot through service boundaries. A unique project/idempotency key and serializable transactions prevent duplicates and quota races. Mutable status/progress/lease/cancellation/retry fields implement orchestration. The outbox is created atomically with pending result slots. Unique generation/index keeps each slot singular; same-project source FKs preserve variation lineage. Asset review is separate from its original bytes/checksum/metadata. Downloads are private and checksum-verified. See image-generation.md for fencing, recovery and the object-store transaction boundary.

## Phase 5 additive migration

202611020005_asset_history adds AssetSelection and PostgreSQL guards for immutable parent links/completed originals and valid final-image ancestry. All four preceding migrations remain byte-for-byte unchanged. The preservation regression now upgrades a populated Phase 4 fixture including generation and original image metadata/checksum into Phase 5, repeats deployment and compares migration history. Procedural guards require the supported native migration engine; the experimental WASM engine is not a supported alternative. Integration/browser SQL fixtures are separately labeled from native hosted migration evidence.
