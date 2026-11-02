# AI INFLUENCER STUDIO
## Master Product & Engineering Specification

You are the lead software architect and senior full-stack engineer for this project.

Build a production-quality web application called **AI Influencer Studio**.

The application is an end-to-end creative platform for creating, managing, generating, editing, and organizing fictional AI influencers and their visual/social content.

Do NOT attempt to build the entire application in one uncontrolled pass.

First inspect the repository and existing project structure.

Then produce an implementation plan and architecture proposal.

After that, implement the project incrementally, keeping the application runnable after every phase.

---

# 1. PRODUCT VISION

AI Influencer Studio allows a user to:

1. Create fictional AI influencers through a guided multiple-choice workflow.
2. Generate a structured Character DNA profile.
3. Generate a Visual Bible.
4. Define personality, lifestyle, fashion, brand identity, and voice.
5. Define realistic imperfections and signature facial/body characteristics.
6. Create scenes through guided choices.
7. Generate multiple image variations.
8. Edit generated images.
9. Maintain image/version history.
10. Generate videos from characters/scenes/images.
11. Create video storyboards and shot lists.
12. Generate multiple video variations where supported.
13. Edit and extend generated video where supported.
14. Generate captions, social posts, reels, stories and content calendars.
15. Store and organize all generated assets.
16. Maintain character consistency across generations.
17. Detect and warn about continuity conflicts.
18. Support batch generation and asynchronous jobs.
19. Eventually support scheduled automation and social publishing.

The application must be designed as a modular platform, not as one giant prompt.

---

# 2. IMPORTANT ARCHITECTURAL PRINCIPLE

Separate the following layers:

A. USER INTERFACE
B. APPLICATION / BUSINESS LOGIC
C. AI ORCHESTRATION
D. IMAGE GENERATION
E. VIDEO GENERATION
F. DATABASE
G. ASSET STORAGE
H. JOB QUEUE / WORKERS
I. AUTOMATION
J. EXTERNAL PROVIDERS

Do not tightly couple the UI directly to a specific AI provider.

Use provider abstractions wherever practical.

---

# 3. FIRST DEVELOPMENT PHASE

Before writing substantial application code:

1. Inspect the repository.
2. Identify the existing framework, package manager, database and deployment setup.
3. Determine whether an application already exists.
4. Do not unnecessarily replace existing infrastructure.
5. Create a `/docs` directory if appropriate.
6. Create an architecture document.
7. Create a phased implementation plan.
8. Identify dependencies that need to be installed.
9. Identify environment variables required.
10. Identify which functionality requires external APIs.
11. Identify which functionality can be mocked initially.

Do not ask unnecessary questions.

Make reasonable engineering decisions and document them.

---

# 4. RECOMMENDED APPLICATION STRUCTURE

Use an architecture similar to:

/app
/components
/features
/lib
/ai
/database
/workers
/storage
/docs
/tests

Organize feature modules around:

/features/characters
/features/scenes
/features/images
/features/videos
/features/prompts
/features/assets
/features/content
/features/automations

AI modules:

/ai/character-engine
/ai/realism-engine
/ai/scene-engine
/ai/prompt-engine
/ai/image-engine
/ai/video-engine
/ai/continuity-engine
/ai/content-engine

Do not blindly follow this directory structure if the existing framework has a better idiomatic structure. Preserve framework conventions.

---

# 5. MAIN APPLICATION NAVIGATION

The application should eventually contain:

- Dashboard
- Characters
- Scenes
- Images
- Videos
- Content
- Assets
- Automations
- Settings

The primary user journey should be:

Character
→ Scene
→ Generation
→ Variations
→ Edit
→ Review
→ Final Asset
→ Content
→ Calendar

---

# 6. CHARACTER SYSTEM

Characters are the central source of truth.

Each character should contain structured information.

Create a Character DNA model containing:

## Identity

- name
- display_name
- age
- birthday
- nationality
- location
- occupation
- languages

## Personality

- archetype
- traits
- strengths
- weaknesses
- social_energy
- humor
- communication_style
- emotional_style
- ambitions
- fears
- habits

## Appearance

- skin tone
- face shape
- facial proportions
- eyes
- eyebrows
- nose
- lips
- jaw
- hair
- hair color
- hair texture
- body type
- height
- distinguishing characteristics

## Realism DNA

Include:

- skin texture
- pores
- freckles
- pigmentation
- beauty marks
- minor scars
- facial asymmetry
- eyebrow asymmetry
- natural under-eye texture
- natural lip texture
- peach fuzz
- natural body asymmetry
- realistic body proportions
- natural posture
- other subtle imperfections

Realism should be configurable.

Do NOT make every character heavily imperfect.

Use a realism level:

1. Editorial
2. Polished social media
3. Natural influencer
4. Candid
5. Documentary realism

Also allow the user to define one or more signature imperfections.

Signature imperfections should be treated as persistent identity anchors.

---

# 7. VISUAL BIBLE

Every character should have a Visual Bible.

It should contain:

- canonical face description
- canonical hair description
- canonical body description
- canonical skin description
- signature features
- makeup
- fashion identity
- jewelry
- color palette
- photography style
- preferred lenses
- preferred lighting
- preferred compositions
- realism level

The Visual Bible is the canonical source used by image and video prompt generation.

---

# 8. IMMUTABLE VS VARIABLE CHARACTER ATTRIBUTES

Implement the concept of attribute stability.

IMMUTABLE:

- identity
- facial structure
- eye color
- skin tone
- core body proportions
- signature facial characteristics
- core personality

SEMI-PERMANENT:

- hairstyle
- makeup
- fashion style
- accessories

VARIABLE:

- outfit
- location
- pose
- activity
- lighting
- weather
- camera
- mood
- scene

The system must not accidentally alter immutable attributes when creating new scenes.

---

# 9. CHARACTER CREATION WIZARD

Build a guided wizard.

The user should make choices instead of writing everything manually.

Example stages:

1. Influencer category
2. Niche
3. Target audience
4. Personality archetype
5. Social energy
6. Communication style
7. Name
8. Nationality
9. Location
10. Face
11. Eyes
12. Hair
13. Skin
14. Body
15. Fashion
16. Makeup
17. Signature features
18. Realism level
19. Lifestyle
20. Brand identity
21. Content pillars
22. Voice

The user may select:

- one option
- multiple options
- custom option

The UI must allow users to go backward and edit previous choices.

---

# 10. CHARACTER GENERATION

After completing the wizard:

Generate:

1. Character DNA
2. Visual Bible
3. Brand DNA
4. Realism DNA
5. Social Voice
6. Initial content pillars
7. Initial image-generation profile

Display a review page before saving.

Allow:

- Save
- Edit
- Regenerate
- Duplicate
- Cancel

---

# 11. SCENE BUILDER

Users should be able to select a character and create a scene.

Scene wizard:

1. Location
2. Environment
3. Activity
4. Outfit
5. Mood
6. Expression
7. Pose
8. Camera
9. Lens
10. Lighting
11. Time of day
12. Weather
13. Composition
14. Candidness
15. Realism level

Allow custom values.

Generate multiple scene concepts.

---

# 12. SCENE CONTINUITY

Before generation, run a continuity check.

Check:

- character consistency
- visual consistency
- fashion consistency
- environment consistency
- physical plausibility
- realism
- camera consistency
- requested overrides

If something conflicts with the character:

Display a warning rather than silently changing the character.

Example:

"Character consistency warning: this hairstyle differs from the canonical hairstyle."

Options:

- Keep canonical appearance
- Use requested change for this scene only
- Permanently update character

---

# 13. IMAGE GENERATION ENGINE

Create an abstraction:

ImageProvider

with methods conceptually equivalent to:

generate()
edit()
createVariations()

Do not hard-code the entire application to one provider.

The engine receives:

Character DNA
+
Visual Bible
+
Realism DNA
+
Scene
+
Camera
+
Lighting
+
User instructions

and produces:

Positive prompt
Negative prompt
Generation parameters
Provider request

Store the resulting metadata.

---

# 14. PROMPT ENGINE

Do not use one static prompt.

Build prompts dynamically.

Prompt structure:

1. Character identity
2. Facial appearance
3. Body appearance
4. Signature features
5. Skin realism
6. Hair
7. Outfit
8. Scene
9. Pose
10. Expression
11. Environment
12. Camera
13. Lens
14. Lighting
15. Composition
16. Photography style
17. Realism instructions
18. Negative prompt

The prompt engine should be deterministic when given the same inputs, unless randomness is intentionally requested.

---

# 15. REALISM ENGINE

Create a dedicated realism module.

It should control:

- skin texture
- pores
- freckles
- pigmentation
- facial asymmetry
- natural hair
- flyaway hairs
- body asymmetry
- wrinkles where appropriate
- natural posture
- realistic fabric
- realistic reflections
- realistic shadows
- photographic imperfections

Avoid excessive imperfection.

The objective is believable human photography, not making the character unattractive.

---

# 16. NEGATIVE PROMPT ENGINE

Negative prompts must be dynamic.

Create:

Universal negative prompt rules.

Then scene-specific rules.

Then camera-specific rules.

Then generation-type-specific rules.

Examples of artifact classes:

- plastic skin
- waxy skin
- excessive smoothing
- unnatural symmetry
- malformed hands
- extra fingers
- fused fingers
- distorted limbs
- incorrect anatomy
- duplicate objects
- warped jewelry
- unnatural hair
- incorrect reflections
- incorrect mirror geometry
- distorted clothing
- impossible perspective
- CGI appearance
- excessive HDR
- artificial lighting
- uncanny expression
- duplicate people
- text
- watermark
- logo

Do not blindly send every negative term for every generation.

The engine should select relevant rules.

---

# 17. IMAGE VARIATIONS

The user should be able to request:

- 1
- 2
- 4
- 8
- configurable batch size

Each variation should share the same character identity but vary:

- composition
- pose
- expression
- camera
- crop
- lighting
- subtle environmental details

The UI should display results in a grid.

Each result should support:

- Favorite
- Reject
- Edit
- Duplicate
- Generate variations
- Use as video source
- Download/export
- Add to collection
- Compare

---

# 18. IMAGE VERSION TREE

Never destroy the original asset.

Example:

Original
├── Edit 1
│   ├── Edit 1A
│   └── Edit 1B
├── Edit 2
└── Final

Store parent/child relationships between assets.

Allow the user to navigate the version tree.

---

# 19. IMAGE EDITOR

Support natural-language editing.

Examples:

- "Make her smile slightly."
- "Change the dress to black."
- "Remove the sunglasses."
- "Change the background to Paris."
- "Keep everything except the hairstyle."
- "Make the lighting warmer."

The editor should pass the original image plus the edit instruction to the image generation/editing provider.

Do not regenerate unrelated character properties unnecessarily.

---

# 20. VIDEO STUDIO

Video generation must be treated separately from image generation.

Allow:

- text-to-video where supported
- image-to-video where supported
- character/reference-driven video where supported
- video extension where supported
- video editing where supported

The application must detect provider capabilities.

Do not expose unsupported options.

---

# 21. VIDEO STORYBOARD

Before generating a longer video, create a storyboard.

Each shot contains:

- shot number
- duration
- camera
- framing
- subject
- action
- expression
- environment
- movement
- transition
- audio/dialogue if applicable

Example:

Shot 1:
0–4 sec
Wide
Walking

Shot 2:
4–8 sec
Medium
Stops and looks toward camera

Shot 3:
8–12 sec
Close-up
Smiles

Shot 4:
12–15 sec
Product/lifestyle shot

Allow users to edit individual shots before generation.

---

# 22. VIDEO VARIATIONS

Support multiple video variations where the provider permits it.

Variation dimensions can include:

- camera movement
- pacing
- expression
- action
- framing
- lighting

Each video should have a version history.

---

# 23. VIDEO EDITING

Create a natural-language editing interface.

Examples:

- "Make the camera movement slower."
- "Extend the final shot."
- "Change the background."
- "Remove the first two seconds."
- "Make her look toward the camera."
- "Use the previous image as the character reference."

Preserve the original video.

---

# 24. ASSET LIBRARY

Every generated object is an Asset.

Asset types:

- character
- reference image
- generated image
- generated video
- scene
- prompt
- storyboard
- outfit
- location
- campaign
- social post

Store metadata:

- character
- project
- scene
- parent asset
- provider
- model
- prompt
- negative prompt
- generation settings
- creation time
- status
- tags
- favorite
- version

---

# 25. CONTENT STUDIO

Create:

- Instagram posts
- TikTok concepts
- Reels
- Stories
- captions
- hooks
- carousel concepts
- content calendars

Content generation must reference the Character DNA and Social Voice.

Avoid generic captions.

The character should sound like herself.

---

# 26. CONTENT CALENDAR

Allow:

- calendar view
- draft
- scheduled
- published
- archived

Content should reference actual generated assets.

---

# 27. AUTOMATION ENGINE

Eventually support workflows such as:

Create scene
→ Generate 4 images
→ Analyze/select preferred results
→ Generate variations
→ Create caption
→ Create short-form video
→ Add to calendar

Make automation modular.

Do not implement publishing integrations until the core generation system is stable.

---

# 28. JOB SYSTEM

Generation tasks must be asynchronous.

Create a job abstraction with:

- queued
- processing
- completed
- failed
- cancelled

Jobs should store:

- type
- input
- provider
- status
- progress where available
- error
- result asset
- timestamps

The UI should update without requiring page refreshes where practical.

---

# 29. DATABASE

Design normalized relational models for:

- users
- projects
- characters
- character_versions
- scenes
- scene_versions
- assets
- asset_versions
- prompts
- generations
- generation_jobs
- videos
- storyboards
- storyboard_shots
- content_items
- campaigns
- automation_workflows

Avoid storing the entire application state as one giant JSON object.

Use structured fields for frequently queried data.

JSON fields may be used for flexible provider-specific metadata.

---

# 30. SECURITY

Never expose provider API keys to the browser.

All provider requests must happen server-side.

Use environment variables/secrets.

Validate all user input.

Validate uploaded files.

Implement appropriate authentication and authorization.

Do not log secrets.

Do not expose internal provider credentials in generated prompts or UI.

---

# 31. PROVIDER ABSTRACTION

Create interfaces such as:

ImageProvider
VideoProvider
LanguageModelProvider
StorageProvider

Implement the initial provider required by the product.

Keep the interfaces extensible.

The UI should not need to know provider-specific API details.

---

# 32. MOCK MODE

Implement a development/mock mode.

When external generation APIs are unavailable:

- create mock generation jobs
- simulate processing
- return sample assets
- allow the entire UI workflow to be tested

This is essential for development.

---

# 33. ERROR HANDLING

Generation failures must be recoverable.

Display useful errors.

Allow:

Retry
Retry with modified prompt
Change provider
Cancel
View technical details

Never silently lose a generation request.

---

# 34. UI PRINCIPLES

The interface should feel like a professional creative application.

Use:

- clear navigation
- cards
- grids
- wizards
- progress indicators
- generation status
- image previews
- asset metadata
- side panels
- modal editors
- version history

Avoid making the application feel like a generic chatbot.

Chat can exist as a creative assistant, but it should supplement the visual interface.

---

# 35. CREATIVE ASSISTANT

Include an optional AI assistant panel.

The assistant can understand commands such as:

"Create a beach scene for Sofia."

"Give me five outfit options."

"Make this more candid."

"Create four variations."

"Turn this image into a 10-second fashion reel."

"Keep the face but change the outfit."

The assistant should translate natural language into structured application actions.

It must not bypass authorization or safety checks.

---

# 36. CHARACTER CONSISTENCY ENGINE

Create a continuity service that compares:

Current request
against
Canonical Character DNA
and
Visual Bible.

Return:

- compatible
- warning
- conflict

Explain conflicts.

Allow:

temporary override
or
permanent update.

---

# 37. TESTING

Create automated tests for:

- character creation
- character updates
- prompt generation
- negative prompt generation
- continuity detection
- scene generation
- image job creation
- video job creation
- asset versioning
- authorization
- error recovery

Create fixture characters and scenes.

Use mock providers for tests.

---

# 38. DOCUMENTATION

Create:

/docs/architecture.md
/docs/database.md
/docs/ai-pipeline.md
/docs/image-generation.md
/docs/video-generation.md
/docs/prompt-engine.md
/docs/character-system.md
/docs/development.md
/docs/environment.md

Keep documentation synchronized with implementation.

---

# 39. DEVELOPMENT PROCESS

Implement in phases.

PHASE 1:
Foundation + database + navigation + characters.

PHASE 2:
Character DNA + Visual Bible + Realism DNA.

PHASE 3:
Scene Builder + Prompt Engine.

PHASE 4:
Image Generation + Variations.

PHASE 5:
Image Editing + Version Tree.

PHASE 6:
Video Studio + Storyboards.

PHASE 7:
Content Studio.

PHASE 8:
Automation.

PHASE 9:
Provider expansion + publishing integrations.

After every phase:

1. Run tests.
2. Run lint/type checks.
3. Verify application starts.
4. Fix errors.
5. Update documentation.
6. Summarize what changed.
7. Identify the next phase.

Do not proceed to a large subsequent phase if the current phase is broken.

---

# 40. FIRST TASK

Do NOT immediately build everything.

First:

1. Inspect the repository.
2. Determine the existing stack.
3. Determine whether a database already exists.
4. Determine whether authentication exists.
5. Determine the current build/deployment setup.
6. Produce `/docs/architecture.md`.
7. Produce `/docs/implementation-plan.md`.
8. Produce `/docs/data-model.md`.
9. Identify missing dependencies.
10. Identify environment variables.
11. Identify any architectural conflicts with the existing project.

Then give me a concise implementation report.

Only after that should you begin Phase 1.

The application must remain runnable throughout development.

Prioritize maintainability, modularity, testability, and provider independence over rapid generation of a huge amount of code.