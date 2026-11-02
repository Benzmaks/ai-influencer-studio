# Image generation and variations — Phase 4

Image Studio connects exact saved CharacterVersion and SceneVersion snapshots to durable background jobs and private PNG assets. It preserves the studio's existing design; Images and Assets are available, while video/content/automation remain Planned. No real image provider, paid key, billing, editing or Phase 5 version-tree UI is enabled.

## Browser workflow

Choose a project in the header. Create a complete Character DNA profile, create a photography scene, resolve continuity conflicts and save a version. In Images choose character/version, matching scene/version, 1/2/4/8 results, one of four advertised aspect ratios, the mock provider/model and a seed. Review assembled prompts and continuity findings, then Generate mock images. The gallery polls persisted status/progress and survives refresh. Queued jobs remain durable even if Redis or the worker is unavailable; start both services if progress does not begin.

The mock provider produces original seeded geometric PNG test patterns, with MOCK written into the pixels and file metadata. They are not influencer photographs, do not depict the selected character, and are never represented as real AI variations. Aspect ratios are actual raster dimensions: 1:1 480×480, 4:5 384×480, 9:16 270×480 and 16:9 480×270. Prompt, negative prompt, seed, source bytes and variation strength affect reproducibility. Results in one batch are distinct; repeating exactly the same inputs intentionally reproduces identical bytes. There are no external inference calls.

Favourite and Reject are exclusive review states and can be toggled back to unreviewed. Both preserve original bytes. Download streams the signature-checked PNG through an authenticated, project-authorized private endpoint with checksum verification, attachment disposition and no-store caching. Generation details show exact references, prompts, realism, settings, provider/model, seed, source, job, timestamps and status. Character/scene links open their details; the generation metadata retains the exact historical references even if the canonical current version later changes. Assets provides the same authorized results with review filters; older batches can be loaded in pages of 30. Collections are not implemented and no fake collection controls are shown.

Create variations selects a completed original as source, pins the original character/scene versions, and exposes supported subtle/balanced/bold controls. The new batch stores a same-project sourceAssetId on every child and never overwrites the original. This is a mock pattern variation operation, not image editing. Only a source from the exact selected character and scene versions is accepted.

## Durable orchestration

An authorized request validates all settings, rejects character/scene mismatches, archived characters, video scenes and unresolved continuity conflicts, then recompiles prompts on the server. Client prompt text is not trusted. A serializable PostgreSQL transaction creates Generation, all pending ImageAsset slots and GenerationOutbox together. Every generation stores exact immutable version references and a complete effective request snapshot, including rules version and zero estimated/charged cost. Composite foreign keys prevent references crossing projects.

The HTTP request does not invoke a provider or connect to Redis. `npm run worker` runs the dispatcher and BullMQ consumer separately. The dispatcher adds a stable generation ID to Redis, then records deliveredAt. A crash between enqueue and acknowledgement repeats delivery safely. Delivered nonterminal records are reconsidered after 15 seconds; lost Redis contents can be rebuilt from PostgreSQL. BullMQ jobs are removed after completion/final queue failure so a durable unfinished request can be redispatched. BullMQ stalled-job detection recovers crashed consumers.

A PostgreSQL lease/token is acquired atomically before processing. The lease is renewed every five seconds and expires after 30 seconds. Competing consumers cannot acquire it while valid; every asset/result commit is fenced by the current token and noncancelled processing status. Completed slots are skipped on recovery. A crashed attempt can be regenerated safely because only the zero-cost deterministic mock is enabled. A result produced after cancellation or lease loss is not committed; its newly written object is removed where possible.

Each slot is attempted at most three times automatically. A partial batch retains successful originals and records failures; only failed slots reset on explicit retry. Manual retry is limited to three per generation. Cancellation is eligible only for queued/processing jobs, immediately fences commits, cancels pending slots and preserves already completed results. A mock call already in flight may finish, but cannot append a cancelled result. Workers verify the requesting actor still has project write access before processing and storage operations enforce membership as well.

Object storage and PostgreSQL cannot share a transaction. A hard kill in the narrow window after writing a private object but before committing its database reference may leave an unreferenced object; it is not exposed in the gallery. Referenced originals and job records remain safe. Automated age-based orphan cleanup is not implemented; production storage lifecycle/retention remains a deployment decision.

## Cost and provider boundaries

The image capability registry advertises only implemented provider/model, operations, batch sizes, aspect ratios and source-variation controls. Contracts retain room for future real adapters. Only registered mock-image requests are accepted and the worker rejects paid/nonmock providers. A future adapter must add provider-side idempotency, timeout reconciliation, cost reservation and capability contract tests before enabling paid execution; the current automatic retry policy is not authorization to repeat ambiguous paid requests.

Development quotas are enforced transactionally: 10 active batches and 2000 result slots per project, max batch 8. `GenerationBudgetPolicy` defines reservation/reconciliation ports for future accounting. Current metadata records zero estimated/charged USD. No payment integration or live charge is implemented.

## Running and diagnostics

Run PostgreSQL, Redis and shared local asset storage, then `npm ci`, `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`. Start `npm run dev -- --hostname 127.0.0.1` and, in another terminal, `npm run worker`. Both must share DATABASE_URL, REDIS_URL and LOCAL_STORAGE_DIR and run from the source directory. AUTH_MODE remains development only on private development machines. Settings/`npm run health` diagnose PostgreSQL, Redis and storage; queue errors retain durable requests and print fixed, credential-free recovery messages.

Optional IMAGE_QUEUE_NAME defaults to studio-images (deployment namespace), and MOCK_IMAGE_DELAY_MS accepts 0–10000 for local mock progress/recovery testing; neither changes output bytes. The private Mac launcher runs password-protected local Redis on 56379 and a separate worker without Docker. Standard CI uses Node 24/native Prisma; the existing Monterey compatibility preview retains Node 22. Physical Mac Redis compilation/launcher execution remains unverified in the cloud environment.

Run integration tests against an isolated development/test database with the normal worker stopped: they inject failures and kill their own isolated worker. CI starts its browser worker only after integration tests finish. See phase-4-validation.md for actual outcomes and ai-pipeline.md for phase boundaries.

## Phase 5 extension

Mock image editing, byte-copy duplication, branch history, comparison, final selection and richer library organization are now implemented on the Phase 5 branch; see image-editing.md. Earlier Phase 4 scope statements above describe that milestone's original boundary. New optional request fields select edit/copy operations without enabling a real provider. Existing async reliability and storage guarantees remain, with added SQL guards for immutable completed originals and parent relationships. Collections and real image processing are still absent.
