# Phase 2 validation

Implementation branch: `phase-2-character-dna`. No Phase 3 work or automatic merge.

## Creation investigation before implementation

Latest main's desktop/mobile Phase 1 browser suite passed (four tests): authenticated login, project create/select, character create/edit/archive and preserved history. No creation regression was reproduced in the managed environment. The user's Mac is not remotely accessible, so its specific failure remains unconfirmed. The UI now exposes Projects directly in the header, a first-project action in the creator, and actionable canonical-address errors for Origin mismatches. Authorization and CSRF checks were not relaxed.

## Executed local checks

- 28 unit tests across five suites: deterministic seven-document compilation, custom choices, adult/size/realism validation, signature anchors at all levels, stability classes, legacy snapshot behavior, providers, storage and auth.
- 14 PostgreSQL integration tests across two suites: original Phase 1 authorization/concurrency checks plus private drafts, stale saves, single concurrent publication, immutable DNA edits, legacy-edit preservation, archive conflicts, duplication and revoked membership.
- Eight real Chromium desktop/mobile tests: complete ten-step wizard, blank draft save/resume, backward editing, custom appearance, all-step fit, review reload, rebuild, publication, immutable edit, duplicate/archive, unauthenticated APIs and retained Phase 1 quick form.
- Migration regression passed: populated original Phase 1 → current schema, unchanged original checksums/rows/pointers/membership, immutable snapshots and repeat deployment.
- Lint, type and format checks passed. Production build and real production-server rejection of development credentials/existing development tokens passed.

The original shell-expanded test exclude glob selected only one integration suite when a second integration file was introduced. The test script now explicitly targets tests/unit; all 28 unit tests actually executed. A mobile grid min-width defect was fixed after real browser clicks showed the stretched step list blocking Save & close. Browser assertions now check the visual viewport and run without forced clicks.

Local DB checks use the existing explicit experimental fallback because native engine downloads are blocked by this instance's network policy. Hosted CI uses only native Prisma engines and independently runs the same gates. Hosted results must be recorded from the actual branch run; configuring a workflow is not a pass. PR-management calls currently return a proxy 403; Git pushes and public GitHub check pages work.

The private web process remains on port 3000. No cloud browser preview capability is exposed here and no public loopback link is provided. A separate local-only Monterey updater preserves the user's working folder, private credentials and database and packages no secrets. Its shell syntax and archive contents are checked; the actual Mac updater/backup restoration cannot be tested from this cloud machine.

## Hosted result

[Native CI run 41395746948](https://github.com/Benzmaks/ai-influencer-studio/actions/runs/41395746948) succeeded for implementation commit `aa3921abe9120545354c20d830597acd23c2cb28` in 3m 53s. It runs the supported native Prisma path, locked install and all declared quality, migration, authorization, browser and production gates. Public GitHub status was observed; raw authenticated logs/API remain unavailable. Documentation/updater-only follow-up commits trigger the same CI and must be checked at their final head before reporting their status.

The 28 unit tests also passed under the official checksum-verified Node 22.23.4 Linux runtime, providing an additional compatibility check for the user's existing Monterey setup. This is not a claim that a physical Mac or its installer was tested.
