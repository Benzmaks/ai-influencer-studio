# Phase 3: Scene Builder and Prompt Engine

Adds a five-step visual Scene Builder in the existing studio design, with saved character-version selection, card/custom scene choices, three labeled mock concepts, resumable drafts, editing, duplication and immutable scene history. Dashboard/navigation now identify Scenes as available while future generation modules remain Planned.

Scenes pin exact CharacterVersion references. Continuity returns affected fields with compatible/warning/conflict decisions, preserves signature anchors, supports explicit canonical and permitted scene-only appearance choices, and routes permanent changes through the existing immutable Character DNA editor. Unresolved/protected conflicts allow drafts but block ready saves and prompt preparation. No canonical identity is silently changed.

Separate realism/positive/negative modules prepare deterministic, labeled mock photography/video prompts with scene/camera/target-specific negatives. No media or paid requests are generated. The additive Scene/SceneVersion migration leaves old migration SQL/data unchanged; transactions, immutable-update SQL and composite project/version references preserve history and authorization.

Validation: 40 unit tests, 20 PostgreSQL integration tests, populated Phase 1→2→3 migration preservation/redeployment, 12 desktop/mobile browser tests, lint/type/format, production build and production credential/session rejection passed locally. All 40 unit tests also passed under Node 22. Native hosted CI: https://github.com/Benzmaks/ai-influencer-studio/actions/runs/41405054870 (**Success**, 3m 12s). See docs/phase-3-validation.md for local experimental-engine caveats, earlier corrected failures and unavailable checks.

A pinned private Monterey updater preserves credentials/assets and creates local database/source/environment backups before applying the additive migration. Physical Mac execution/restore were not available here. See docs/development.md, docs/prompt-engine.md and docs/ai-pipeline.md.

Review only. Do not merge automatically or begin Phase 4.
