# Data model

Status: User, Account, Session, VerificationToken, Project, ProjectMembership, Character, CharacterVersion and AuditEvent are implemented in the applied Phase 1 Prisma migration. Other entities below remain plans for later phases. PostgreSQL is authoritative. All IDs are opaque generated identifiers, timestamps use UTC, and all externally supplied IDs are authorized before use.

## Ownership and authorization

User → ProjectMembership ← Project. Membership has a unique `(project_id, user_id)` and role owner/editor/viewer. Projects must retain at least one owner. Resources belong to one project; roles are enforced in server domain services and worker services. Sessions identify users but do not authorize a resource by themselves. Add Auth.js-compatible user/account/session records as required by the selected adapter; store password hashes only for the explicitly development-only login path.

All foreign references must belong to the same project. Use composite `(project_id, id)` keys and composite foreign keys where applicable; enforce any remaining invariants transactionally. IDs are not security boundaries. Project deletion, membership removal, downloads, queue dispatch and history reads require authorization. Worker service identity is not permission to execute arbitrary client input.

## Core entities and relationships

| Entity                               | Main fields and relationships                                                                                                                                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User                                 | ID, email (unique), display name, timestamps; authentication accounts/sessions                                                                                                            |
| Project                              | ID, name, creator, timestamps; many memberships and domain resources                                                                                                                      |
| Character                            | Project, name/display name, current_version_id, archive status, creator                                                                                                                   |
| CharacterVersion                     | Project, character, version number, schema version, identity fields (age, nationality/location where queried), validated DNA snapshots, author, timestamp                                 |
| Scene                                | Project, character, title, current_version_id, creator                                                                                                                                    |
| SceneVersion                         | Project, scene, character_version_id, version number, structured location/outfit/activity/camera/lighting fields, validated extra settings, explicit overrides and continuity resolutions |
| Prompt                               | Project, character_version_id, scene_version_id where applicable, positive and negative text, prompt-rule version, input hash, seed/parameters                                            |
| Generation                           | Project, type, exact character_version_id and scene_version_id when applicable, prompt_id, provider/model, settings, request hash, idempotency key, mock flag, creator                    |
| GenerationJob                        | Project, generation, type, state, nullable progress, provider request ID, sanitized error, attempts, cancellation request, timestamps                                                     |
| GenerationAttempt                    | Job, attempt number, provider status/request ID, sanitized error, start/finish timestamps; unique `(job_id, attempt_number)`                                                              |
| JobOutbox                            | Project, job, dispatch state, attempts, available_at and dispatched_at; transactionally inserted with generation/job                                                                      |
| Asset                                | Project, kind, character/scene/generation references where applicable, status, favorite, version label, creator, timestamps                                                               |
| AssetVersion                         | Project, asset, version number, storage key/checksum/MIME/size for files, validated structured payload for non-file assets, generation reference, timestamps                              |
| AssetLineage                         | Project, parent_asset_id, child_asset_id, relation (edit, variation, duplicate, final selection); preserves originals and branch history                                                  |
| Collection / CollectionAsset         | Project-scoped named collections and unique asset membership                                                                                                                              |
| Tag / AssetTag                       | Project-scoped tag names and unique asset membership                                                                                                                                      |
| Video                                | Project, asset, generation, duration, dimensions and source_asset_id where applicable                                                                                                     |
| Storyboard                           | Project, character_version_id, title, current_revision_id                                                                                                                                 |
| StoryboardRevision / StoryboardShot  | Immutable revision and ordered shots: duration, framing, subject/action/expression, camera/movement, environment, transition, audio/dialogue                                              |
| ContentItem                          | Project, character_version_id, campaign, channel, format, caption/body, calendar state, scheduled_at and published_at                                                                     |
| ContentAsset                         | Project, content item and exact asset_version_id; ordered attachment list                                                                                                                 |
| Campaign                             | Project, name, goals, date range; many content items/assets                                                                                                                               |
| AutomationWorkflow / WorkflowVersion | Project, title, current version; validated immutable graph definitions                                                                                                                    |
| AutomationRun / AutomationStepRun    | Exact workflow version, project, state, job references, input/result refs and errors                                                                                                      |
| AuditEvent                           | Project, actor, action, resource identifier, timestamp and sanitized change metadata                                                                                                      |

Every generated object is represented in the Asset library: character and scene assets reference exact domain versions; prompt, storyboard, outfit, location, campaign and social-post assets reference the corresponding versioned domain data or a validated structured AssetVersion payload. File-backed assets use storage metadata. Do not duplicate editable canonical DNA in an asset payload. A Generation may yield many assets; batch results track each child job separately so partial failures remain visible.

## Immutable snapshots and canonical pointers

CharacterVersion snapshots include Character DNA, Visual Bible, Brand DNA, Realism DNA, Social Voice, content pillars and initial image profile. Preserve the entire reviewed snapshot; do not build old generations from current character fields. Store frequently filtered identity attributes in structured columns and keep extensible nested descriptions in validated JSON, with a schema version for future migrations. Do not store all application state in one JSON object.

Character and Scene current pointers must reference versions belonging to that exact entity/project. Unique `(character_id, version_number)` and `(scene_id, version_number)` prevent duplicates. Saving an update transactionally inserts a version and advances the pointer with optimistic concurrency; conflicting edits produce a conflict response. Versions referenced by generations are append-only. Archive records instead of cascading deletion through provenance. Account/privacy deletion and retention exceptions require an explicit production policy.

A SceneVersion pins its CharacterVersion and records field-level overrides, stability classification, user choice and reason. Keep canonical appearance, temporary override and permanent update are explicit outcomes. A permanent update creates a CharacterVersion and a new SceneVersion referencing it; it never changes an earlier generation's inputs.

Generation pins all effective inputs, rule versions, model, seed, provider parameters and source AssetVersions. Text-to-video may lack a scene or image source; image-to-video requires an authorized source. Storyboard-driven generation also references an immutable StoryboardRevision. Use normalized GenerationSource rows for multiple exact asset inputs and GenerationShot rows for shot-specific outputs. Nullability is constrained by generation type rather than permitting arbitrary incomplete requests.

## Asset history invariants

Editing or varying creates new assets and lineage edges; never overwrite the original object. AssetVersion tracks metadata revisions or versioned structured payloads, while AssetLineage records creative branches across assets. This distinction prevents two competing parent/child models. Parent and child must share a project; reject self-links and cycles. A derived asset can reference multiple sources through GenerationSource while the version tree displays its primary edit/variation parent. Comparisons are read-only views over selected versions.

## Job and idempotency invariants

Use unique `(project_id, idempotency_key)` on Generation and verify the canonical request hash before returning an existing request. A batch has a parent generation and child generations with deterministic child keys; supported requested sizes include 1, 2, 4 and 8, subject to provider limits and configured quotas. Track per-result errors and aggregate progress without marking partial success as complete success.

Allowed job states: queued → processing → completed/failed/cancelled; queued → cancelled. Retrying a failed job is an explicit guarded transition with an attempt record and bounded budget. Terminal state updates use optimistic locking. Provider callbacks/polling must match stored request identity and deduplicate completion. Cancellation does not erase attempts or paid-request history.

## Indexes and integrity checks

Index project plus common filters: resource status/created_at, character and scene history, job state/available_at, generation provider request ID, content scheduled_at, and asset favorite/type. Foreign keys protect provenance; avoid cascading deletes of referenced versions. Validate JSON schemas on writes and reads across schema upgrades. Test cross-project reference rejection, viewer writes, revoked membership, concurrent version saves, duplicate requests, cyclic lineage, worker restarts and ambiguous provider outcomes.

## Phase 1 persistence notes

Auth.js credentials use JWT sessions; Account/Session/VerificationToken tables are integration foundations and are not populated by credentials login. CharacterVersion currently stores basic identity fields and a schema-versioned identity JSON snapshot; full DNA/Visual Bible/Brand/Realism/Social Voice fields arrive in Phase 2. A PostgreSQL rewrite rule blocks version updates. App operations archive instead of deleting characters; administrative database deletion is outside the user-facing API. Composite foreign keys constrain current-version ownership. Role changes and permanent character edits create audit rows. Scene/generation/asset history tables are not yet implemented.

## Phase 2 additions

CharacterDraft is implemented with private creator/project scope, optional target/base revision, bounded wizard state, optimistic revision and completion state. Publication is transactional and pins the complete schema-version-2 canonical snapshot. No original migration or schema-version-1 row was rewritten. See [database.md](database.md) and [character-system.md](character-system.md).
