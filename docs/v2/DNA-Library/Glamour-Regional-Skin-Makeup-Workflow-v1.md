# Glamour DNA — Regional Skin & Makeup Workflow v1.0

**Status:** User-approved workflow direction. Reproducibility and close-up skin quality **not yet validated**; not an enforced generation lock.

## Original assets
The user's downloadable `AIS_Glamour_Workflow_v1.zip` contains:
- `references/latest_experiment.png`: glamour experiment, generation `af726edf-d381-41d9-a4b3-ef6774744ee8`
- `references/prior_portrait.png`: original glamour portrait provided for assessment
- `references/photographic_skin_makeup_reference.png`: user-supplied bronze-glam reference on a different face/complexion; **technique guidance only**
- Full `GLAMOUR_WORKFLOW.md` and machine-readable `profile.json`

**IMPORTANT:** Actual image bytes must still be uploaded into durable repository asset storage. The generation ID and this Markdown **do not** preserve or supply a reference image to a model automatically.

## Mandatory realism rules
- Retain identity, facial proportions, skin tone, hair and camera framing of the base character; use makeup reference **only for technique**, never copying its identity.
- Fine, understated, *irregular* region-specific skin detail. No recurring fingerprint, maze, grid, spiral, square, embossed pore patterns. Check cheekbone highlights, forehead, eyelids, nose, lips and shoulder.
- Freckles, scars, acne, sweat, water, oil are **not defaults**; only use when specifically requested or established by Character DNA.
- Strong glam may include bronze shimmer lids, tapered wing liner, natural separated lashes, feathered terracotta blush, subtle foundation/concealer transitions, a **selective** pearlescent cheek highlight, and fine branching lip lines with slight lipstick opacity variation.
- Camera: eye-level three-quarter beauty close-up; warm neutral background; broad diffused key, restrained fill, soft shadow roll-off, realistic optical detail. Skin texture must fit actual face pixel size. No global sharpening, blur or artificial skin stamping.

## Region-based workflow
1. Load real base character image, plus reference image as a separate technique guide; log provider and exact settings if available.
2. Map forehead, eyelids/eye corners, upper cheekbone, lower cheek, nose/alar creases, lips, temples, chin, neck and shoulders.
3. At native 100% resolution, identify only defective regions. Evaluate pattern recurrence, abrupt texture scale changes, waxy plastic reflection and makeup-edge issues.
4. If true mask/inpainting support exists, repair **only** affected regions. Protect face geometry, eyes, brows, jewellery, hairstyle, pose, outfit and background. If not, call the result a full-image generation experiment; **never claim targeted repair**.
5. Reconstruct restrained anatomically plausible detail per region, preserving overall contours, colour and light. Avoid direct pixel transplant, blur, fake pore stamps and extreme texture enhancement.
6. Independently refine foundation, concealer, blush, eyeshadow, eyeliner and lip layers, with subtle human application variation; keep critical sharp edges and regional reflectance.
7. Compare normal view and native-resolution crops against the base and technique benchmark. Reject fingerprint patterns, identity drift, uncontrolled shine, overlaid freckles or defects.
8. Save original image, output, provider/model, available prompt/settings/seed, DNA profile version, inspection findings, approval status.

## Quality and productisation
- Visual approval of an image is **not** proof of a repeatable workflow.
- Mandatory Realism DNA + editable Glamour Makeup DNA + automatic-but-editable Camera DNA, with a defined region edit policy.
- Gate success on independent checks: identity fidelity, skin patterns at 100%, anatomical detail, makeup realism, composition preservation, and first-pass acceptance.
- No claims of automatic pre-publication correction until mask support and quality checks are implemented and tested.
