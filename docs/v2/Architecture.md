# AI Influencer Studio V2 — Proposed architecture

**Draft / design intent, not a verified description of the deployed system.** Inspect the current repository, migrations and provider interfaces before implementation.

## Architecture goals
- Extend the existing Next.js/TypeScript, PostgreSQL/Prisma, Redis/BullMQ and project-scoped foundations rather than introducing a parallel stack.
- Preserve explicit workspace authorization, canonical identity, immutable provenance and repeatable generation workflows.
- Deliver two UIs (Simple and Advanced) over **one versioned character schema**.
- Separate variable scene styling, provider-dependent generation parameters and permanent identity changes.
- Allow future multi-provider, team, budget and paid capability growth without exposing credentials.

## Conceptual domains
1. **Identity + Workspace:** production authentication, memberships, project roles, audit and workspace permissions.
2. **Character DNA:** typed fields, realism baseline, user overrides, approved immutable versions, signature anchors and reference media.
3. **Template / Inspiration:** licensed/original starter presets; cloning creates an independent character draft with traceable template version.
4. **Scene / References:** role-tagged references (character, scenery, outfit, pose, style), rights/consent evidence and scene-scoped overrides.
5. **Prompt / Capability:** prompt assembly from frozen version snapshots; model capability registry; unsupported-option detection and versioned recipes.
6. **Generation + Jobs:** durable queue orchestration, idempotency, cancellation, retry and credit-cost provenance; actual provider operation always occurs server-side.
7. **Asset + Lineage:** immutable originals, object storage, restricted URLs, comparisons, edits, derived versions, final selection and review status.
8. **Quality Intelligence:** reviewer scores and specific failure codes for skin, teeth, mouth, hair, expression, motion, prompt fidelity and scene continuity.
9. **Content + Marketing:** scripts, storyboards, posts, experiments, calendar and actual platform metrics (subject to authorisation).
10. **Provider Connections + Commercial (future):** secure BYO API credentials/OAuth where supported, balance caching and refresh timestamps, quotas and spend controls, subscriptions/entitlements and separate Studio credit ledger.

## Character settings resolution
For a generated asset, resolve effective settings in an auditable order:
`schema defaults → realism profile defaults → starter preset → user character edits/advanced overrides → approved Character DNA version → scene-specific styling → supported provider generation settings`.
Scene styling cannot alter canonical identity anchors. Resolution yields a frozen snapshot and warnings/validation messages. Changing a permanent attribute creates a new character draft/version; it does not overwrite previously generated assets.

## UI composition
- Public marketing landing (video carousel with reduced-motion fallback) and separate authenticated app shell.
- Character Studio uses a persistent preview plus contextual controls and a Simple/Advanced switch. Lazy-load detailed settings and media rather than forcing huge payloads into every task or page.
- Clear boundaries among draft state, generated candidates, an approved canonical character and scene-only temporary looks.
- Display estimated cost and current funding source before paid jobs; balances are actual provider values with timestamps or explicitly unavailable.

## Data design guidance
Prefer additive, reviewed database migrations with backward-compatible defaults. Model tattoos, piercings, skin anchors and reference roles as stable, serialisable records. Store measurement units explicitly (e.g. centimetres). Keep provenance of source files, model/version, seed where supported and any operation that changes media. Use reviewed schema evolution; do not assume the schema below is already implemented.

## Privacy and trust
Use only consented or authorised likeness reference uploads; protect them with tenant scoping, retention/deletion and access controls. Encrypt API credentials server-side. Never place provider secrets, private references or detailed user data into public prompts/logs. Use clear AI-generated disclosure in marketing and social publishing.

## Reliability and QA
Reuse durable BullMQ patterns and existing regression infrastructure. Verify project isolation, immutable source preservation, migrations, idempotency/retries, costs and cancellation. For realism, evaluate actual samples with documented calibration; do not treat a slider as proof of physical accuracy.

## Deferred implementation decisions
- Which specific provider(s) support account connections, balance endpoints, reference controls and paid generation?
- Which UI slider values map reliably to provider inputs?
- How will approved identity anchors be validated visually across images and video?
- What billing/credit architecture and thresholds are commercially viable?
- What is the final DAC/product brand and accessible motion treatment?

Record decisions here only after evidence and an approved engineering task.
