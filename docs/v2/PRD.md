# Product Requirements Document — AI Influencer Studio V2

**Status:** Draft for product discovery, design validation and later scoped implementation. **Not engineering authorisation.**

## Product vision
A character-first creative workspace for designing original, believable virtual influencers and producing repeatable images, video and social content. Parent brand under consideration: DAC (Digital Asset Creative); the product name is a working name, subject to branding/trademark checks.

## Users and jobs
1. **Beginner creator:** choose a starter, make a few visible choices, generate candidate identities, select and approve a character, and produce a social-ready scene without learning prompts.
2. **Professional / advanced creator:** refine detailed anatomy and photorealism, control references and providers, preserve canonical identity, compare variations, and repeat campaigns.
3. **Team / agency (later):** collaborate securely across workspaces with role-based control and campaign history.

## V2 winning principles
- **Result first:** inspiration gallery containing original fictional starter characters, with Use & Customise, Surprise Me, Describe, Build from Scratch and authorised reference-based entry points.
- **Simple + Advanced, same DNA:** beginner asks only for key choices (presentation, adult age band, heritage/ancestry, skin tone, build, hair and optionally style); defaults complete the rest. Advanced expands relevant controls in place and does not erase other settings.
- **Photographic realism by default:** plausible region-specific skin texture, natural variation, restrained gloss, fine hairs, mouth/teeth, expressive folds and consistent identity. Makeup, coverage and glow are *scene styling*, not a requirement for realism.
- **Character-centric continuity:** distinguish persistent Character DNA and approved anchors from temporary scene styling; immutable versions; preview → compare → approve before changing canonical identity.
- **One connected production journey:** Discover → Quick Setup → Customise → Review/Approve → Character Workspace → Scene/Reference → Generate → Edit/Compare → Video → Content/Publish.
- **Transparent controls:** show capability limitations, output ratios/resolution, provider, funding source and verified balance where available, estimated cost and precise status.
- **Evidence, not claims:** benchmark identity fidelity, skin/mouth realism, teeth, motion, prompt adherence, cost per approved asset and downstream content performance.

## Character DNA scope
- Identity, culture/nationality/heritage, mixed ancestry as optional self-described fields. **Never infer appearance or skin quality from ethnicity or country.**
- Anatomy: face geometry, eyes/colour/shape, brows, nose, lips, teeth, smile, body build, lean-to-muscular definition, height for any gender presentation, proportions and posture.
- Hair: colour, length, texture/curl pattern, natural hairline, baby hairs, flyaways, nape hairs; facial and body hair where selected.
- Skin: independently selected tone and undertone, regional texture, pigmentation, shine, fine follicles, fixed beauty marks, optional blemishes; reliable rendering across skin tones.
- Distinctive features: tattoos and piercings with position/orientation and canonical references; jewellery may vary per scene.
- Expression/motion: eye–cheek–lip–jaw coordination, smile/teeth consistency, anger, sadness, squinting, speech and timing; evaluated against real video output.
- Style/brand/social voice: aesthetics, personality, content pillars, narratives and captions.

## Key screens
1. Public landing: calm DAC identity, short hero message, **one approved character in three-card video carousel**, one active muted clip; Daily Vlog, Style, Travel, then Movement/Dance. Pause, sound opt-in, reduced motion and poster fallback. Five-step workflow below hero, then starter gallery.
2. Inspiration gallery: categories, fictional starter cards, preview and customise.
3. Quick Setup: few essential controls and complete default DNA.
4. Character Studio: persistent image preview, quick tabs (Face, Hair, Body, Style, Distinctive), collapsible advanced sliders, makeup and glow at bottom.
5. Approval / character home: face/profile/smile/full-body reference reviews, identity lock, history, quick Create Scene action.
6. Image and Video Studio: saved character or authorised reference, scenery upload and/or description, outfits/action, aspect ratio, resolution, provider selector, output and edit histories.
7. Content/learning: research-backed formats and tracked experiments; distinguish hypotheses from validated results.

## Proposed commercial model — unvalidated
Possible Starter / Creator / Pro access based on capacity, advanced controls, team/automation functions. Baseline realism is available to all tiers. User-funded provider API connections and any Studio-funded credits must have separate accounting. No advertised pricing, free credits or billing entitlement should be treated as approved.

## Non-goals / cautions
- No real provider integration, billing, affiliate payouts, automatic posting or subscriptions without their own authorised phase, security and cost review.
- Avoid impersonation, unconsented likeness reuse, unsupported provider balance displays, unverified claims of realism or guaranteed virality.
- Mock image/video paths never constitute proof of real generated motion.

## Validation gates
- Beginner completes setup and finds customisation with minimal friction; advanced user can control precise features without losing edits.
- Every permanent edit is a new approved version; scene-only changes never mutate canonical DNA.
- Evaluate identical character across facial close-ups, smiles, profiles, full-body scenes and later real video.
- Compare multiple skin tones and lighting conditions; record failures.
- User test the responsive prototype and separately validate willingness to pay.

## Workstream separation
V1 core engineering continues under its own roadmap. V2 UX, product intelligence, subscriptions and brand ideas are planning until approved. Existing code and tests are the source of truth for what is currently implemented.
