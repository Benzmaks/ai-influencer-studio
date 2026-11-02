# Character system — Phase 2

The ten-step creator at `/characters/new` captures identity, category/niche/audience, personality/lifestyle, physical appearance, signature style, realism, imperfections, brand and social voice, then presents a final review. Visual cards support selection and deselection, and custom text/list entries remain available. The existing quick identity form is retained at `/characters/new?mode=basic`.

The five realism levels retain their canonical names: Editorial, Polished social media, Natural influencer, Candid, Documentary realism. Signature imperfections are explicit persistent anchors; no extra marks are invented when realism changes. A general “None” means no additional marks beyond explicit anchors. Body proportions, posture, natural texture, pores, freckles, pigmentation, beauty marks, scars and subtle asymmetries are configurable.

## Draft lifecycle

`CharacterDraft` belongs to a project and its creator. Drafts are private to that creator even within a shared project; publication makes the character available to authorized project members. Viewers may read their own existing drafts but cannot create, update, discard or publish them. Owner/editor permission is checked on every write and again during publication.

Save & close supports incomplete identity drafts. Moving forward/backward or selecting another step saves the current answers and step; unsaved field edits are visibly labeled and require Save & close or navigation within the wizard to persist. This is not background autosave on every keystroke. Draft URLs survive reload and Characters lists resume links. Discard requires confirmation and never deletes an existing character. Valid adult age and bounded field sizes remain enforced even for drafts.

Draft revision numbers prevent silent cross-tab overwrites. An edit draft pins its target character's revision; stale or archived targets cannot be published. Conflicts preserve the active draft and all saved history. A successful publication marks a draft completed and removes it from the unfinished list. Concurrent publication can create at most one new character/version; repeat completed-draft publication is rejected rather than creating duplicates.

## Canonical documents and consistency

`ai/character-engine` calls the existing mock language-provider interface with a deterministic structured template. Schema-version-2 snapshots store the reviewed answers, all seven documents and mock/template provenance:

- Character DNA: identity, positioning, personality, appearance, interests, lifestyle and stability classifications.
- Visual Bible: canonical face/hair/body/skin, signatures, styling, colors and photography preferences.
- Brand DNA and Realism DNA.
- Social Voice and initial content pillars.
- Image profile: settings and identity references, explicitly marked as planned generation configuration.

Core identity, semi-permanent styling and scene-variable attributes are explicitly distinguished in the review and profile. Permanent edits are allowed only as new canonical versions. This phase does not implement scene overrides or continuity analysis; those belong to Phase 3. Signature features and imperfections persist through full edits, basic identity updates and duplicates unless explicitly changed in a new permanent version.

The profile page exposes all seven documents and historical DNA snapshots. Duplicate creates an independent character at version 1 and never changes its source. Archive retains all history and prevents edits. Basic Phase 1 characters remain schema version 1 until a full DNA version is explicitly saved; defaults shown in the upgrade wizard are not fabricated historical data. Basic edits to a DNA character preserve the complete profile and anchors.

## Boundaries

No real language/image/video service is called and no paid key is required. Rebuild mock profile intentionally returns the same output for the same answers. No portraits are generated in Phase 2. Server validation reconstructs the snapshot from authorized stored answers; client-supplied profile/provenance is not trusted. Browser controls are not the authorization boundary.
