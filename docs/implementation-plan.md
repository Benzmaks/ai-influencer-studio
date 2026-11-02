# Implementation plan

Status: Phase 1 was explicitly authorized and is implemented on `phase-1-foundation`; see [development.md](development.md) and [phase-1-validation.md](phase-1-validation.md). Phase 2 is implemented for review on phase-2-character-dna; see phase-2-validation.md. Phases 3–9 remain plans. The master requirements are in [product-specification.md](product-specification.md); architecture and persistence contracts are in [architecture.md](architecture.md) and [data-model.md](data-model.md).

## Shared completion gate

After each phase run the relevant automated tests, lint, TypeScript checks and production build; start web/worker services as required and exercise a representative functional workflow. Record executed, failed, skipped and unavailable checks separately. Update development and feature documentation, summarize changes and identify the next phase. Fix broken phase functionality before advancing. Mock outputs must remain labeled; no future screen may imply that an unavailable feature works.

## Phase 1 — Foundation, database, navigation and characters

Dependencies: supported Node.js/npm, PostgreSQL, Redis; no paid AI credentials. Execute these tasks in order, retaining a runnable app after each meaningful increment:

1. Bootstrap Next.js App Router with TypeScript, npm lockfile, lint/type/build scripts and a minimal home page. Pin mutually supported versions and Node LTS; add ignored local configuration paths and an example environment file without secrets. Acceptance: clean locked install, type check and production build succeed; home page returns expected content.
2. Add a polished studio shell with project selector, responsive sidebar/mobile navigation, keyboard focus states, accessible forms, loading/empty/error states and a coherent visual system. Include Dashboard, Characters, Scenes, Images, Videos, Content, Assets, Automations and Settings. Acceptance: all routes render at mobile and desktop widths without horizontal overflow; future features explicitly say “Planned” and have no fake working controls.
3. Add Prisma/PostgreSQL schema and reviewed initial migration for users/auth records, projects/memberships, characters and immutable initial character versions; implement repository/service boundaries and transactional current-version pointers. Acceptance: migrations apply to a fresh database; seed is repeatable and cannot overwrite user data; data survives process restart.
4. Add Auth.js session plumbing and development-only seeded credentials using a maintained password-hashing library. Document the selected production OIDC integration boundary without inventing credentials. Implement owner/editor/viewer guards, protected routes/endpoints and project-scoped resource queries. Acceptance: unauthenticated requests are rejected; viewer writes and cross-project reads/mutations fail; development login is refused in production.
5. Implement project create/list/select, membership foundations and server-side input validation. Acceptance: an authenticated user creates a project and becomes owner, can switch between permitted projects, and cannot remove its last owner. UI reports database failures with recovery instructions.
6. Implement basic character list/create/detail/update/archive and immutable snapshot persistence, with a minimal identity form rather than the full Phase 2 wizard. Acceptance: a character can be created and edited in an authorized project; editing creates a version, concurrent updates are detected and earlier snapshots remain unchanged.
7. Define typed language/image/video provider ports, capability registry and deterministic mock fixtures. Implement local StorageProvider with project-scoped access and an S3-compatible adapter contract. Acceptance: contract tests exercise mock language output, mock image/video fixtures, unsupported-operation rejection and private asset access; no paid requests occur and no output is presented as real generation. Full generation UI/jobs begin in Phase 4.
8. Configure environment validation, documented PostgreSQL/Redis startup options, health diagnostics and local-storage initialization. Add mock provider selection. Acceptance: web starts with configured infrastructure and no paid keys; missing infrastructure produces actionable diagnostics. A separately labeled fixture demo can support UI work without databases but cannot masquerade as persistence or production readiness. See [environment.md](environment.md).
9. Add unit/integration tests and browser smoke checks using mock providers, and basic GitHub Actions CI with PostgreSQL/Redis service containers. Acceptance: CI performs locked install, migrations, tests, lint/type checks, production build and authenticated character-flow smoke test; tests actually execute and CI needs no paid secrets.
10. Finish `docs/development.md`, update environment instructions and document actual startup/readiness commands. Acceptance: a fresh environment reproduces install, migrations, seed, login and character workflow; record actual evidence and remaining limitations before requesting Phase 2 authorization.

Deliverable: runnable and usable project/character foundation, not a completed generation platform. BullMQ worker scaffolding can be introduced here for environment health checks, but durable generation lifecycle acceptance belongs to Phase 4.

## Phase 2 — Character DNA, Visual Bible and Realism DNA

Depends on Phase 1. Implement the guided multiple-choice wizard with single/multiple/custom selections and backward editing across category, niche, audience, personality, identity, appearance, fashion, signature features, realism, lifestyle, brand, pillars and voice. Generate validated Character DNA, Visual Bible, Brand DNA, Realism DNA, Social Voice and initial image profile through mock language orchestration. Add review/save/edit/regenerate/duplicate/cancel and attribute stability classification.

Acceptance criteria:

- Choices persist while moving backward; invalid inputs show field errors and custom choices are retained.
- Review produces all seven required profile outputs; save and permanent changes create immutable versions, duplicate creates a distinct character, and cancel creates no saved character.
- All five realism levels work; signature imperfections persist as anchors without forcing every character to be heavily imperfect.
- Tests cover creation/update, generation validation, version concurrency and project authorization. Add `docs/character-system.md` and `docs/database.md` describing implemented behavior.

## Phase 3 — Scene Builder and Prompt Engine

Depends on Phase 2. Build structured/custom scene options for location, environment, activity, outfit, mood, expression, pose, camera, lens, lighting, time, weather, composition, candidness and realism. Generate multiple scene concepts and immutable versions. Add continuity service and separate realism/positive/negative prompt modules.

Acceptance criteria:

- A scene pins a character version and all structured choices survive save/reload.
- Identity, visual/fashion/environment consistency, plausibility, camera, realism and override checks return compatible/warning/conflict with affected fields.
- Canonical, scene-only and permanent-update choices preserve old snapshots; unresolved conflicts prevent dispatch.
- Identical snapshots/rules/seeds produce identical prompts; negative terms vary with scene/camera/generation type rather than always appending every rule.
- Tests cover scene generation, continuity and deterministic positive/negative prompts; add `docs/prompt-engine.md` and `docs/ai-pipeline.md`.

## Phase 4 — Image Generation and Variations

Depends on Phase 3 plus Redis/BullMQ worker and transactional outbox. Implement asynchronous mock image generation, provider capability registry, durable jobs, authorized polling, result grid, batch limits and recovery. Add a real image adapter only after a provider/model and secure configuration are selected.

Acceptance criteria:

- Mock requests for 1, 2, 4 and 8 results produce labeled assets and exact input/version/provider metadata; unsupported sizes are rejected or explicitly split by orchestration.
- Queued/processing/completed/failed/cancelled states, progress and partial batch failures are visible without page refresh.
- Repeated idempotency keys do not duplicate generation; altered payloads conflict. Worker crashes/outbox retries do not lose requests or duplicate committed results.
- Bounded retry and ambiguous paid timeout behavior pass failure-injection tests; cancellation preserves history.
- Favorite/reject/download/collection actions enforce project access; tests cover job creation, recovery and authorization. Add `docs/image-generation.md`.

## Phase 5 — Image Editing and Version Tree

Depends on Phase 4. Add natural-language editing from an exact original asset, derived variation branches, compare, duplicate, final selection and asset library metadata/history views.

Acceptance criteria:

- Editing submits original image plus instruction and preserves unrelated canonical attributes in the effective request.
- Original bytes/checksum remain unchanged; edit and variation children appear in navigable history, with prompts, provider/model/settings and parent references.
- Compare shows selected versions; cyclic/cross-project lineage is rejected; favorite/reject/export and collection operations remain authorized.
- Tests verify versioning, original preservation, input validation and failed-edit recovery.

## Phase 6 — Video Studio and Storyboards

Depends on Phases 3–5. Add VideoProvider mock adapter to durable jobs, capability-aware text/image/reference generation, storyboard revisions and shot editing. Expose variation, editing and extension only when supported.

Acceptance criteria:

- Each shot stores duration, framing, subject, action, expression, environment, camera/movement, transition and optional audio/dialogue before generation.
- Mock text-to-video and image-to-video use exact authorized source versions; unsupported operations are hidden/explained and rejected server-side.
- Video variation/edit/extension preserve originals and metadata; storyboard revision used by a job cannot change underneath it.
- Tests cover video job creation, input capability constraints, storyboard edits, lineage and recovery. Add `docs/video-generation.md`.

## Phase 7 — Content Studio

Depends on character voice and assets from earlier phases. Add captions, hooks, Instagram posts, TikTok concepts, Reels, Stories and carousel concepts; campaigns and content calendar with draft/scheduled/published/archived states.

Acceptance criteria:

- Generated copy references pinned Character DNA/Social Voice and selected actual assets; fixture characters produce meaningfully distinct voices.
- Calendar scheduling stores UTC and displays the chosen user timezone; edits and state transitions persist and are authorized.
- “Scheduled” means an internal calendar entry; it does not promise external publication. Published may be manually recorded with clear provenance until Phase 9.
- Tests cover asset references, voice inputs, calendar/timezone behavior and authorization.

## Phase 8 — Automation

Depends on stable generation/content services. Add versioned workflow definitions, runs/steps and batch orchestration using the same authorized services. Optional assistant translates text into validated actions and cannot bypass access checks.

Acceptance criteria:

- A mock workflow creates a scene, four images, an explicit selection, variations, caption, short video and calendar draft; automated analysis/selection is labeled and traceable.
- Runs pin definition/input versions, track step progress and support bounded retry/cancel/resume without duplicate paid actions.
- Invalid graphs, unauthorized resources and unsupported provider capabilities are rejected; failed steps retain history.
- Integration tests exercise successful and interrupted runs and prevent cross-project execution. No social publishing integration is required yet.

## Phase 9 — Provider Expansion and Publishing Integrations

Depends on stable core and explicit deployment/provider decisions. Implement selected real adapters, budgets/rate limits and capability mapping; only then add selected social platform connections and scheduled publishing.

Acceptance criteria:

- Each chosen real provider passes contract tests and an explicitly enabled credentialed smoke test; unrun paid tests are recorded as unrun.
- Secure server-side credentials, upload validation, cost limits, timeout reconciliation and redacted logs are verified before paid workflows are enabled.
- Chosen publishing integrations enforce project access, OAuth scopes, token security, idempotent scheduling and visible failed-publication recovery.
- Production authentication, storage, backups, deployment, monitoring and retention decisions are resolved and exercised; documentation matches supported provider/platform capabilities.

## Decisions and scope still open

Phase 1 implementation is ready for review, subject to the validation report and GitHub workflow status. Dependency versions are pinned in the package lock. Production OIDC/provider/model choices, hosting, budget limits, social platforms, retention and backup objectives remain open. These do not block the mock foundation, but they gate real paid operations and production readiness. Phase 2 must not begin without explicit authorization.
