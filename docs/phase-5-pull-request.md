# Phase 5: Image Editing, Comparison and Version History

Adds an image editor, visual branch history, responsive 2–4-image comparison with individual zoom/preferred finals, and a searchable/filterable asset library while preserving the existing studio design and Phase 1–4 workflows. Outputs are clearly labeled simulated mock patterns; no real or paid image provider is connected.

Edit jobs retain exact source bytes/checksum, original metadata, Character DNA/Visual Bible/Realism DNA, effective instructions/trail, prompts, settings, provider/model and immutable version references. Recognized identity/signature changes are blocked or directed to explicit character-version publication. Canonical data is never silently changed. Edits and byte-copy duplication use the existing durable outbox/BullMQ worker, idempotency, retries/cancellation and private storage, producing new children instead of overwriting originals.

The additive migration creates revision-guarded per-original AssetSelection and SQL guards against parent reassignments, completed-original mutation, invalid parents and unrelated final selection. Existing migration SQL/history and snapshots remain intact. Project roles and Origin checks protect mutations; comparisons/library/downloads enforce project access. Rejecting a selected image clears final selection without deleting history. Collections remain unimplemented.

Validation: locked install; 57 unit tests (also Node 22); SQL-backed local 36-test integration run plus documented experimental-adapter shutdown failures on repeats; 20/20 desktop/mobile browser tests; production build and authentication safeguards. Supported native hosted CI passed: https://github.com/Benzmaks/ai-influencer-studio/actions/runs/41423286141 (5m 37s), including native migrations and complete regression/recovery checks. See docs/phase-5-validation.md for precise evidence and local engine limitations.

A source-pinned private Monterey updater backs up existing data, preserves credentials/assets and reuses Redis/worker launchers including the Phase 4 root fix. Physical Mac execution/restore remains unverified here. See docs/development.md and docs/image-editing.md.

Review only. Do not merge automatically or start Phase 6.

Security follow-up: resolves the 19 reported dependency-path findings with
integrity-locked deepmerge-ts 8.0.0 and minimatch 11.0.1 overrides, a guarded
lint-only compatibility bridge and security regression tests. Adds a mandatory
moderate-or-higher audit gate and full native CI on Node 24 and Monterey's Node
22 preview version. No schema/data migration changes or real providers.
See docs/security-maintenance.md for compatibility tradeoffs and final evidence.
