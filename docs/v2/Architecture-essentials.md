# V2 architecture essentials — quick context

**Read this first for a scoped V2 task.** Full design: [Architecture.md](Architecture.md). Product rationale: [PRD.md](PRD.md).

1. **Planning, not permission.** V2 is a proposed design; the current code and authorised task determine what to build. Do not start the redesign or connect paid providers automatically.
2. **Reuse the current architecture.** Next.js/TypeScript, PostgreSQL/Prisma, Redis/BullMQ and existing job, roles, versioning and asset services. Inspect relevant files before changes.
3. **One Character DNA.** Simple Mode fills a complete realistic default profile; Advanced Mode edits specific overrides in the same schema. Do not reset existing overrides on mode change.
4. **Realism always on.** Natural skin texture, controlled sheen, believable mouth/teeth, fine hair and expression coherence are baseline, not paid quality upgrades. Makeup/glow belong to scene styling.
5. **Canonical versus temporary.** Changing facial anatomy, skin identity, height, tattoos or signature features needs an explicit new approved version; outfit, makeup and scenery need scene-only overrides.
6. **Immutable provenance.** Freeze exact character/scene/prompt/provider versions, input references and generation metadata. Never overwrite originals or quietly alter identity.
7. **Provider safety.** Provider account API credits may differ from consumer website credits. Verify actual API capability, balance access and spend before implementing; show unavailable rather than guessing.
8. **Secure by default.** Workspace isolation, authorized likeness sources, encrypted credentials and audited paid generation.
9. **Measure quality.** Evaluate real generated outputs across skin tones, expressions, camera angles and motion; mock output is not validation.
10. **Token discipline.** Read only essentials plus task-relevant code. Open PRD/Architecture sections as needed; report uncertainties; keep diffs and documentation focused.
