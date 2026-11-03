# Ultra-Fine Natural Skin Realism DNA — Approved Visual Direction

**Status:** User-approved visual benchmark, **not** a technically calibrated model profile or implemented feature.
**Date:** 2026-11-03
**Scope:** Photographic rendering across all fictional adult characters and skin tones; distinct from canonical facial identity and from scene-specific light/makeup.

## Approved benchmark
Latest extreme macro image of smiling warm-brown-skinned adult woman (dark loose hair, gold hoops; small defined beauty mark on cheek; natural upper teeth visible).

- **Generation reference ID:** `7418cc88-278c-4c8e-9b3e-125efca4886a`
- **Source image (conversation artifact, not yet committed as a binary repository asset):** `ultra_detailed_sunlit_smile_macro.png`
- **Immediate preceding approved experiments:** `bff202a2-0d36-4ae9-9c5e-10bf19553dcc` (sweat/oil microdetail), `519aadd8-0e06-46a9-a454-95f8b1895244` (refined macro), `24c12e0e-47c0-45ae-aae3-6b668ef8ba2c` (ultra close-up).
- Reference IDs assist locating conversation history; **they are not stable provider seeds or API re-generation controls**. Archive actual images with authorisation before expecting durable visual reproduction.

## Visual contract

1. **Detail at extreme zoom:** retain tiny, non-uniform pores, delicate vellus hairs, eyebrow hair separation, subtle pigmentation, thin lip creases, shallow smile/under-eye folds and realistic texture in highlights.
2. **Multi-scale, region-aware texture:** micro-relief and pore characteristics differ on forehead, nose, upper cheek, under-eye, outer cheek, lips and chin; avoid repeating a stamped texture across all surfaces.
3. **Optically plausible oil and sweat:** thin, irregular sebum sheen with local tiny highlights and occasional micro-beads where motivated by heat/exertion. Reflectance must not erase pore-scale microstructure. No smooth plastic patches, uniformly wet face or oversized uniform drops.
4. **Lighting:** high contrast and direct sunlight/flash are permitted, but retain skin detail under bright highlights, with believable falloff, plausible exposure and no circular/swirl-like artificial specular patterns.
5. **Pigmentation and imperfections:** subtle, sparse, non-symmetrical freckles/marks that belong to the character; no artificially plastered freckles, enlarged red spots, acne or uniform blemishes inserted merely to signify realism.
6. **Expression and teeth:** smile affects eyelids, cheeks and mouth coherently; upper teeth have plausible spacing, shape and natural ivory tones; no duplicated micro-teeth or crocodile-like lower rows; mouth continuity across scenes.
7. **Identity:** optional unique facial beauty mark must maintain location/size across scenes. Skin colour/undertone and other facial features remain consistent with approved Character DNA.
8. **Representation:** same standard across very fair to deep skin tones. Do not equate any ethnicity or ancestry with a particular texture, tone, sheen or imperfection pattern.
9. **Distance-aware rendering:** macro may reveal pores and tiny sweat; medium and full-body shots must naturally reduce visible detail according to optics, sensor size, focus and output resolution—not artificially sharpen enlarged pores.

## Two separate control layers

**Persistent Character Skin DNA**: skin colour/undertone, stable pigmentation, defining marks, fine facial hair, reference anchors and normal physiological texture baseline.

**Scene/camera rendering profile**: distance, focal length, focus, depth of field, direct flash/daylight, exposure, highlight rolloff, colour processing, noise/grain, scene makeup and temporary oil/sweat.

Never change canonical DNA simply to compensate for a different photography style.

## Repeatable evaluation before calling it production-ready

- [ ] Capture canonical neutral front, 3/4, side, soft smile, full smile and full-body references.
- [ ] Capture 100% native-resolution and 200–400% nearest-neighbour inspection crops (avoid claiming synthesized enlargement proves actual microdetail).
- [ ] Inspect forehead, inner/outer cheek, nose bridge/tip, under-eyes, lips, teeth and beauty mark separately.
- [ ] Test under diffuse light, hard noon daylight, frontal flash and low light; verify highlights do not wash out or fake texture.
- [ ] Test at least four varied skin tones; record different failures without bias.
- [ ] Check identity, teeth geometry, beauty-mark position, realistic sweat/oil and visible texture at actual output resolution.
- [ ] Test across real provider/model versions and seed controls where supported; keep cost, settings and output provenance.
- [ ] Record both normal viewing and zoom findings. One excellent close-up does not prove medium/full-body or video quality.

## Prompt construction guide

Preserve the approved character and scene; specify **tiny heterogeneous skin microrelief and fine follicle texture that survives bright, oily highlight regions without exaggerated pore visibility**, delicate naturally variable vellus hairs, restrained local sebum sheen and a few physically plausible micro-sweat droplets. Keep defining beauty marks and natural lip/teeth anatomy consistent. Adjust texture detail to camera distance and sensor/optics. Prefer believable photographic falloff to cosmetic retouching.

**Avoid:** plastic/waxy shine, uniform pore overlays, conspicuous giant freckles/blemishes, oily lacquer appearance, artificial repeating wave/ring patterns, HDR/over-sharpening, wrinkle engraving, overly white or extra-small duplicated teeth.

## Honest limitation

This is an **observed visual target**, not extractable hidden numerical DNA, a validated prompt recipe, guaranteed outcome or provider-independent shader. Before any provider implementation, compare actual image files and calibrate repeatability and output scale. The latest image was positively approved for aesthetic direction; final objective quality signoff remains a separate step.
