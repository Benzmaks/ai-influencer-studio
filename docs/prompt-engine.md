# Scene and prompt engine (Phase 3)

Scenes → Create scene opens the five-step guided builder. Choose an active saved influencer and an exact historical or current character version. Complete Character DNA is needed to prepare prompts; a Phase 1 basic identity may be saved in a scene draft but produces a blocking continuity finding until a DNA version is explicitly created and selected. This avoids inventing missing facial anchors.

## Scene inputs and persistence

The builder includes location, environment, activity, outfit, accessories, pose, expression, mood, camera angle, framing, lens, depth of field, lighting, time, weather, atmosphere, composition, candidness, five realism levels and photographic style. Every photographic choice has selectable cards and a bounded custom text input. Image/video selects the prompt target only; it does not generate media.

Back/Continue and numbered steps retain in-memory choices. Save draft persists at any step; drafts resume from step 1 with all choices intact. Changes are not saved on every keystroke. The interface shows unsaved changes, guards browser unload and confirms leaving through the scene-library link. Save before using other navigation or closing a tab. Three deterministic, explicitly mock concept presets can be applied and saved as separate scenes. Duplicate copies the latest saved choices into a new draft with independent history; save pending changes before duplicating.

Each save appends SceneVersion and increments Scene.revision using a transactional compare-and-swap. A concurrent save returns 409 without overwriting either history or the loser's unsaved controls. SceneVersion stores exact choices, CharacterVersion reference, prompt output, continuity findings, rule version and author. Composite foreign keys prevent character or scene references crossing projects. SQL prevents UPDATE of SceneVersion; there is no scene/history delete endpoint. CharacterVersion and the two existing migration files are unchanged.

## Consistency and overrides

`ai/continuity-engine` inspects the pinned character snapshot, requested appearance overrides, camera/framing, wardrobe/weather, environment/weather, activity/pose, lighting/time and realism. Findings have an affected field and compatible, warning or conflict status. Warnings permit review and saving ready; conflicts allow drafts but block ready status and produce no positive/negative prompt. No generation dispatch exists in Phase 3; Phase 4 must enforce this same server-side gate against the exact saved versions.

Canonical: a Keep canonical appearance resolution discards the requested override when composing the effective prompt. Scene-only: hair style/color, makeup and fashion may be temporarily overridden and are always reported. Protected facial structure, body proportions and signature imperfections cannot be changed through scene overrides. Permanent update: the selector reports a conflict and directs users to the existing Character DNA editor. Publish a new immutable character version explicitly, then select that version in the scene. Scene creation never silently publishes character updates or repoints old scenes.

The checks are deterministic structured rules, not semantic understanding of arbitrary prose or image analysis. Custom text can contain contradictions that the rules do not recognize. Human review remains necessary; a Compatible result is not a guarantee of physical or visual correctness. No AI provider can guarantee character consistency.

## Prompt composition

`ai/prompt-engine/positive.ts` composes labeled identity, facial/body appearance, signature anchors, skin realism, hair, outfit/accessories/makeup, setting/activity, pose/expression, environment, camera/lens/depth, lighting/time, composition and style/candidness. Values derive from the exact saved Character DNA answers underlying the Visual Bible and Realism DNA; no current-character lookup replaces the pinned snapshot. `ai/realism-engine` scales the photographic treatment while keeping signature marks fixed and avoiding excessive newly invented imperfections. None means no additional marks beyond explicit signatures.

`ai/prompt-engine/negative.ts` starts with a small anatomy/skin/CGI/watermark baseline and adds terms for visible limbs, hand-related activities, reflection environments, jewelry, wide-angle/nonstandard framing, high candid realism and video temporal artifacts. It does not append every artifact class. No paid generation or external language calls occur. Prepared prompts and concepts are deterministic mock/template output and explicitly labeled. Same normalized choices + exact character snapshot + rule version 1 always produce identical prompts; no random seed is used or necessary. Rule upgrades must increment rulesVersion and never rewrite persisted historical prompts.

Prompts can be reviewed/copied, saved as draft, or saved ready after server-side recomputation. Saved prompts remain available in read-only version history even after canonical character changes.
