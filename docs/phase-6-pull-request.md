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

Validation: native hosted CI passed the full Node 24.19.0 and Monterey-preview
Node 22.23.4 matrix: https://github.com/Benzmaks/ai-influencer-studio/actions/runs/41445859763
(7m 15s). Each passed locked install, zero-vulnerability audit, native fresh/
populated/repeated migrations and seed, 67 unit tests, 46 integration tests
(including real killed image/video worker recovery), 24 desktop/mobile browser
tests with actual playback, lint/types/format and production build/auth safeguards.
Local browser regression passed 24/24 with a documented cloud timing allowance;
additional private preview checks cover another locale/timezone and Origin
rejection. Local WASM migration and intermittent foundation-disconnect failures
remain explicitly documented; local SQL fixtures are not claimed as native
migration certification. The private Monterey ZIP pins application `4545360`,
backs up saved data, retains credentials/assets and applies the additive migration.
No public preview or paid service is introduced.

See `docs/video-generation.md` for capability boundaries and `docs/development.md`
for the private Monterey preview. Review only; do not merge automatically or
begin Phase 7.
