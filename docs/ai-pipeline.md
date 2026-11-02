# AI pipeline through Phase 3

The existing language/image/video provider interfaces and mock capability registry remain unchanged. Scene concepts and prompt preparation use deterministic local templates; they are not real AI inference and create no image/video assets. No paid keys or new environment variables are required.

1. Auth.js resolves the current user. Server services check project membership for every read/preview and owner/editor access for scene create/update/duplicate.
2. The browser sends bounded, Zod-validated structured choices and an explicit character-version identifier. The server resolves that identifier only inside the authorized project.
3. Continuity inspects the exact immutable snapshot and appearance overrides. Conflicts produce findings and blank prompts. Warnings remain visible and do not alter canonical identity.
4. Separate realism, positive and negative modules prepare deterministic output. A ready save recomputes it on the server; browser-supplied prompt text or readiness flags are never trusted.
5. The database transaction checks the expected scene revision, appends SceneVersion and advances Scene's revision/status/title. New versions reference exact immutable CharacterVersion IDs. SQL blocks updates to stored scene snapshots.
6. UI review exposes current output and historical versions. Copy is local clipboard only. No provider request, dispatch, job, queue or media asset is created.

PostgreSQL is required. Redis remains optional for Phase 3 and is reported separately in health diagnostics; durable BullMQ work and image generation begin in Phase 4. Local/S3 storage interfaces are unaffected because scenes contain JSON/text rather than media bytes. Missing PostgreSQL uses the existing actionable application error flow.

## Future generation boundary

Phase 4 must reference an exact SceneVersion and its exact CharacterVersion, check authorization and continuity again, detect provider capabilities, and persist the effective prompts/rules/settings with the job. Unresolved conflicts must prevent dispatch. Paid idempotency, bounded retries, transactional outbox and generation records are Phase 4 work, not implemented by the current scene-ready flag. Production authentication remains disabled until an approved OIDC integration is implemented; development credentials must never be published.

## Migration and reproducibility

Apply `202611020003_scenes` through `npm run db:migrate`, never reset a populated database. It creates only Scene/SceneVersion, indexes, constraints and an immutable-update rule. Do not modify or squash the original migrations. Regenerate Prisma before restarting the server. The default supported path remains Prisma CLI/client 6.19.3 native library/classic engine; Phase 4 aligns the optional local query adapter to 6.19.3; its WASM schema engine is not a supported migration configuration.

Tests cover deterministic concepts/prompts, adaptive negatives, protected anchors, temporary and permanent override routing, scene history, optimistic concurrency, role and project boundaries, SQL immutability, migration upgrades and desktop/mobile workflows.

## Implemented Phase 4 boundary

The image-only branch is implemented: authorized effective inputs → transactional Generation/slots/outbox → Redis/BullMQ delivery → separately running worker → deterministic labeled mock PNG → private local storage → fenced result commit → authorized polling/gallery/download. Generation references exact SceneVersion and CharacterVersion snapshots and recomputes continuity/prompts before acceptance. Video dispatch and editing remain unimplemented. See image-generation.md for the working lifecycle, quotas, cancellation, retries and recovery limitations. Earlier Future generation boundary text describes the original Phase 3 boundary, now realized for mock images only.


## Phase 5 mock edits and history

The existing queue now dispatches ImageProvider.edit with exact source bytes, instruction, source metadata envelope and pinned Character DNA/Visual Bible/Realism DNA. It checks source checksum and preserves originals; byte-copy jobs bypass model calls. Image-only targets and cumulative instructions are persisted, protected canonical/signature mutations are rejected by conservative rules, and new parents are immutable. Comparison/library/final selection use authorized asset services. No real provider, photo retouching or video dispatch is implemented. See image-editing.md.
