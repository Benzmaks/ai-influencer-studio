# Video Studio and Storyboards — Phase 6

## Implemented workflow

Choose a project → save a complete Character DNA profile → save a Scene → open
Videos → select exact Character DNA and Scene versions → edit a storyboard →
save draft/ready revision → choose text-to-video or image-to-video → Generate
mock video → review per-shot previews/history → Download. Assets also includes
video history and a link to Video Studio. Content and Automations remain Planned.

The interface retains the existing green/paper visual system, responsive
navigation and project selector. Storyboards support 1–8 shots, add/remove,
duplicate, reorder, custom inputs and selection presets. Saved drafts survive
reload. Duplicating a saved storyboard creates an independent draft. Owner and
editor roles can write; viewers can inspect storyboards, video history and
private downloads. The latest 100 storyboards and 200 approved image candidates
are offered in selectors; video history paginates in groups of 30 batches.

Every shot stores duration, framing, camera/lens, subject, action, expression,
environment, camera movement, transition, optional audio and dialogue. Facial
performance schema version 1 stores mouth movement, smile-to-laughter transition,
eye–mouth coordination and onset/peak/release times. Timing must satisfy
0 ≤ onset ≤ peak ≤ release ≤ shot duration. These are planning contracts for a
future Facial Expression and Motion Realism Bible, not validated facial motion.

## Honest mock-provider boundaries

Only the registered zero-cost mock provider/model is available. It supports
text-to-video (`generate`) and image-to-video input (`image-to-video`), returning
one existing fixed, silent, **two-second H.264 MP4, 320 × 400 / 4:5** per shot.
Each shot is a separate preview/download. Repeated clips are clearly labeled
samples; seed, text and image inputs do not create different rendered footage.
This phase tests orchestration and provenance, not AI video generation quality.
No runtime ffmpeg dependency, real provider, API key or paid request is added.

Drafts can plan 0.5–30-second shots. This provider's supported duration is exactly
2 seconds; other durations cannot dispatch. A storyboard can therefore produce
up to eight two-second sample clips. Clips are not stitched into a longer film.
Transitions, audio/dialogue and facial-performance fields are retained with
prompts but are not rendered/synthesized. The provider advertises no video
variation, edit, extension, reference-video or assembled-film capability. Those
controls are absent, the limitation is explained, and server requests for
unsupported operations are rejected. The VideoProvider port retains optional
variation/edit/extension methods for a separately authorized compatible adapter.

## Exact inputs, consistency and approvals

A storyboard revision pins same-project CharacterVersion and SceneVersion; the
SceneVersion must pin that same CharacterVersion. Character DNA, Visual Bible,
Realism DNA, signature features and imperfections are included in generation
preservation references. Scene continuity is recompiled in video mode. Known
identity-changing shot instructions are blocked from ready publication/generation;
they may be kept as unfinished drafts for correction. English rule checks are
conservative and are not semantic AI; custom prose still requires human review.
Permanent identity changes use the existing explicit Character DNA publication
workflow and a matching new scene/storyboard revision. Historical inputs never
follow current pointers.

Image-to-video accepts a completed image from these exact character and scene
versions, explicitly approved by **Favourite or Select preferred final**, and
not rejected. ImageAsset's immutable ID identifies its exact file/metadata
version; no competing editable asset-version model is introduced. Generation
stores the source ID, checksum, original metadata, approval at submission and
creation time. The worker rechecks project write permission, current source
approval and the pinned checksum. Revoking approval before execution produces a
visible failed job; approve it again before retrying. The source image is read,
never rewritten. Text-to-video rejects a stray source-image parameter.

## Persistence and worker architecture

The additive `202611020006_video_studio` migration adds Storyboard,
StoryboardRevision, ordered StoryboardShot and VideoAsset. Generation gains
`kind` (existing rows default to image) and nullable storyboard references;
existing image records, inputs and migration files are preserved. Saving a
storyboard transactionally appends a revision and shot rows with optimistic
concurrency. SQL rejects revision/shot updates and deletion/addition of shots
used by generations. Same-project composite foreign keys and matching-reference
triggers protect storyboard, generation and image-source ownership.

Video Generation pins exact storyboard/character/scene versions, normalized
per-shot effective prompts, dynamic negative prompt, preservation references,
provider/model, seed, source metadata, dimensions, fixed fixture identity,
simulation flags and zero-cost information. SQL protects video provenance and
completed original files/checksums/metadata against overwrite. No mutable parent
pointer or video lineage reparent operation exists while derivative operations
are unsupported; no cyclic video graph can be created through the API.

The existing GenerationOutbox is written atomically with Generation and pending
VideoAsset slots. `npm run worker` processes images and videos on the existing
BullMQ queue (`IMAGE_QUEUE_NAME`, default `studio-images`, retained for backwards
compatibility). Video work does not execute in HTTP handlers. Delivery repair,
expiring leases, heartbeat/fencing, bounded three attempts per shot, three manual
retries, project active-job quota and cancellation preserve history. A partial
batch exposes successful clips and retries failed slots only. Cancelling fences
late commits and keeps completed originals. The zero-cost mock is the only
allowed execution adapter; live paid reconciliation/billing remain out of scope.

Video assets use the same private LocalStorage interface. Authenticated MP4
responses verify checksum, support single byte ranges/416 errors for playback
and seeking, use private/no-store and nosniff headers, and expose a real download.
Static mock captions explain the silent sample. Membership is checked for every
file request; files are never placed in public storage.

## Routes

- `/videos`: storyboard editor, revision selection, mock generation and history.
- `/assets`: existing image library plus video history/previews/downloads.
- `GET/POST /api/projects/:projectId/storyboards`.
- `GET/PUT /api/projects/:projectId/storyboards/:id`.
- `POST /api/projects/:projectId/storyboards/:id/duplicate`.
- `GET/POST /api/projects/:projectId/videos`, with cursor pagination on GET.
- Existing `GET /api/projects/:projectId/generations/:id` and POST cancel/retry
  routes handle video jobs too; the image list continues to show image jobs only.
- `GET /api/projects/:projectId/video-assets/:id/file[?download]`.

Mutations require the configured browser Origin and a current owner/editor
membership. Unknown/cross-project references, mismatched versions, unsupported
models/providers and stale revisions are rejected server-side. Idempotency keys
are project-wide across image and video requests; a reused key with different
settings conflicts rather than creating a second request.

See [phase-6-validation.md](phase-6-validation.md) for actual test evidence and
[development.md](development.md) for private startup instructions.


## Remaining operational boundaries

A hard interruption after a private file write but before its database commit
can leave an unreferenced private file, as in Phase 5. Fenced database slots
prevent duplicate committed outputs; orphan cleanup and retention policy remain
future work. Production OIDC, paid-provider budgets/reconciliation, S3 transport
and physical backup restoration are not production-ready claims of this phase.
New video timestamps use explicit UTC to keep SSR and browser locales consistent.
