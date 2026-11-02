# Phase 6 verification

Phase 5 merge verified at `73e68ad` (PR #5), including security maintenance
`10983b0` and updater/docs `60ac311`. Work is isolated on
`phase-6-video-studio`; nothing is merged and Phase 7 has not started.

## Executed and passed so far

- Prisma client generation, TypeScript, lint and zero-vulnerability npm audit.
- 67/67 unit tests in ten suites, preserving all prior 61 tests and adding six
  storyboard/continuity/provider/range-response tests.
- Full local PostgreSQL/Redis integration run: 45/45 in six suites, including all
  previous 36 tests and nine new video tests. Actual video/image workers are
  killed and recovered through BullMQ; no recovery test is simulated by merely
  editing a status flag. Also covered: immutable shots/revisions/provenance,
  concurrent saves/idempotent requests, original preservation, per-shot provider
  input references, role boundaries, approved source enforcement/revocation,
  unsupported operations/durations, cancellation/late commits and partial retries.
- Production webpack build and live production authentication safeguards:
  development login rejected, session absent, old development token rejected,
  protected projects API returns 401. No paid credentials used.

Browser verification and supported native hosted CI are in progress; final
outcomes and exact implementation references will be recorded before completion.

## Failures and unavailable checks

The first integration run passed 44/45. A source-preservation assertion compared
mutable Favourite/review timestamps as though they were immutable original data;
it now compares actual bytes, checksum and immutable metadata. The corrected
full suite passed 45/45. The first formatting check reported one new component;
that file was formatted. These earlier failures are not represented as passes.

The cloud cannot download native Prisma engines under its current network policy.
Its experimental WASM migration check was executed and failed on PostgreSQL
catalog type `name`, as in previous phases. Local browser/integration checks use
a **separate new SQL-backed Phase 6 fixture** initialized with all six reviewed
migration files; the previous Phase 5 database and private environment are
retained. No Prisma migration ledger was fabricated and no existing database was
reset. This local fixture is not a supported migration deployment. Native fresh,
populated Phase 1→5→6 preservation, repeated migrations/seed and checksum checks
must pass hosted CI before the phase can be called ready.

Physical Monterey execution of the new updater, backup restoration, real video
providers, realistic facial motion and rendered audio are unavailable/unrun.
The mock explicitly cannot validate real facial movement or produce different
footage from different prompts/seeds/images. No end-user cloud port-preview tool
is available in this environment; the private Mac updater is the visual preview
route. Cloud loopback is used for automated browser verification.
