# Database implementation

PostgreSQL/Prisma remain the existing Phase 1 foundation. The supported release/CI path uses aligned native Prisma 6.19.3 client and migration engines. The explicitly unsupported local WASM/adapter fallback remains development-only; see development.md and phase-1-review.md.

Phase 2 adds only `CharacterDraft` through `202611020002_character_drafts`. The original migration is unchanged. The new table has project/author foreign keys, an optional same-project target character plus base revision, validated answers JSON, current step, optimistic revision and completion/timestamps. Constraints enforce step 0–9, positive revision and paired target/base revision. An index supports active private drafts by project, creator and update time.

Existing CharacterVersion fields already support the immutable DNA snapshot. Phase 2 snapshots use schemaVersion 2 and include reviewed answers, seven profile documents and explicit mock provenance. Frequently displayed name/display name/age/location/occupation/background remain structured columns. No original rows are backfilled or rewritten; schema-version-1 identities remain readable.

Publication claims the exact active draft revision and appends the character/version in one transaction, with membership rechecked. Existing character updates also require the pinned active character revision. A conflict rolls back the draft claim and new version. The existing database snapshot update rule and current-version composite foreign key remain intact. No migrations use reset, db push or destructive replacement.

`npm run test:migrations` creates an isolated database, applies the original Phase 1 migration only, populates character snapshots and project membership, upgrades through all current migrations, then checks original row/migration preservation and repeated deployment. It also tests snapshot update prevention. Only the uniquely named disposable database and test-owned temporary configuration are removed; CREATE DATABASE privileges are required for this check.

Before applying to a populated local installation, stop the web app and take a private PostgreSQL dump and source/environment backup. Run db:generate and db:migrate, retaining existing migration history and credentials, then restart and validate the application. The Monterey preview updater automates these steps using the existing private cluster; backups remain local and must not be shared. No actual Mac backup restoration is claimed.
