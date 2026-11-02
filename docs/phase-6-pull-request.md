# Phase 6: Video Studio and immutable storyboards

Replaces the Planned Videos screen with a responsive storyboard editor and
capability-aware mock Video Studio, preserving the existing studio design and
Phases 1–5. Editable, reorderable shots retain duration, camera/framing,
subject/action/expression, environment/movement/transition, audio/dialogue notes
and schema-versioned facial-performance planning. Saves create immutable
revisions; drafts resume, copies are independent and concurrent saves conflict.

Text-to-video and approved-image-to-video use the existing transactional
outbox/BullMQ worker, pinned DNA/scene/storyboard/image versions, bounded retries,
cancellation and recovery. History and Assets show actual playable private MP4
samples with range-aware download and exact metadata. All mock clips are labeled
fixed silent two-second samples per shot, not real character animation, facial
performance validation, different rendered variations or stitched films.
Unsupported video edit/variation/extension controls are absent and rejected by
the server. No real/paid providers or API keys are introduced.

An additive migration preserves existing image data/migrations while adding
storyboard revisions/shots, Generation kind/references and immutable VideoAsset
records. Project roles, same-project composite FKs, source approval/checksum,
continuity checks and SQL provenance guards protect history. Existing image
lists/actions continue to use their original workflow.

Validation: 67 unit tests, 45 local SQL-backed integration tests including real
killed-worker recovery, lint/types, audit and production build/auth safeguards
passed. Browser and native hosted CI final evidence is recorded in
`docs/phase-6-validation.md`. Local WASM migration failure is explicitly retained;
local SQL fixtures are not claimed as native migration certification.

See `docs/video-generation.md` for capability boundaries and `docs/development.md`
for the private Monterey preview. Review only; do not merge automatically or
begin Phase 7.
