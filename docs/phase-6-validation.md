# Phase 6 verification

Phase 5 merge verified at `73e68ad` (PR #5), including security maintenance
`10983b0` and updater/docs `60ac311`. Work is isolated on
`phase-6-video-studio`; nothing is merged and Phase 7 has not started.

## Executed and passed so far

- Prisma client generation, TypeScript, lint and zero-vulnerability npm audit.
- 67/67 unit tests in ten suites, preserving all prior 61 tests and adding six
  storyboard/continuity/provider/range-response tests.
- Full local PostgreSQL/Redis integration run: 45/45 in six suites before the final archival test was added, including all
  previous 36 tests and nine new video tests. Actual video/image workers are
  killed and recovered through BullMQ; no recovery test is simulated by merely
  editing a status flag. Also covered: immutable shots/revisions/provenance,
  concurrent saves/idempotent requests, original preservation, per-shot provider
  input references, role boundaries, approved source enforcement/revocation,
  unsupported operations/durations, cancellation/late commits and partial retries.
- Production webpack build and live production authentication safeguards:
  development login rejected, session absent, old development token rejected,
  protected projects API returns 401. No paid credentials used.

- Full desktop/mobile browser regression: **24/24 passed** in 6.1 minutes,
  including the complete character → scene → approved image → storyboard → text
  and image-to-video → preview/download → Assets flow. The cloud-only rerun used
  a 15-second assertion allowance; committed CI retains normal settings.
- Initial implementation `6eb9803` native hosted CI passed both complete Node
  24.19.0 and 22.23.4 jobs: https://github.com/Benzmaks/ai-influencer-studio/actions/runs/41444218569
  (7m 33s), including native fresh/populated/repeated migrations, repeatable seed,
  audit, 67 unit tests, 45 integration tests, all 24 browser tests and production
  safeguards. No assertion was skipped or weakened for hosted verification.
- Final application build, authentication safeguards, health, lint/types and
  formatting passed after history/archival/readiness improvements.

A final archival-preservation test extends the integration suite to 46. Its
local full run passed **45/46**, including all ten video tests; the existing
foundation repeated-disconnect check timed out under the experimental adapter.
This final local run is not reported as fully passing. The supported native
matrix **passed all 46 integration tests on both runtimes**, independently of
that local limitation: https://github.com/Benzmaks/ai-influencer-studio/actions/runs/41445859763
(7m 15s), implementation `c32e31c`. The same run also passed locked install,
native migration preservation/redeployment/seed, audit, 67 unit tests, lint/types/
format, production build/auth and 24 desktop/mobile browser tests, now including
actual MP4 playback. No checks were skipped.

The Mac updater pins final application snapshot `5c8b0d3dd81b895f3e6a22bf1c7274e15bb0316b`,
which also renders new video timestamps as deterministic UTC. An additional
live private preview check verified actual desktop/mobile playback, mock poster,
saved-board deep links, invalid-Origin rejection and a different mobile locale/
timezone (`en-GB`, `America/Los_Angeles`). Desktop/mobile captures were inspected.
The web preview remains bound to 127.0.0.1:3000 with the shared mock media worker.
There is no user-facing cloud port-preview tool. Mac updater Bash syntax, ZIP
entries/byte equality and inherited launcher-root normalization were verified.

Final branch CI rechecks the same full suite after the documentation/updater
commit. Use the [branch Actions page](https://github.com/Benzmaks/ai-influencer-studio/actions?query=branch%3Aphase-6-video-studio)
for that head's status; the exact final outcome is also reported with the PR.

## Failures and unavailable checks

The first integration run passed 44/45. A source-preservation assertion compared
mutable Favourite/review timestamps as though they were immutable original data;
it now compares actual bytes, checksum and immutable metadata. The corrected
full suite passed 45/45. The first formatting check reported one new component;
that file was formatted. Browser testing found an ambiguous Approved source
image label; an explicit accessible name fixed it. The next desktop attempt hit
the existing five-second character-save timing limit while mobile passed; the
full local rerun then passed 24/24 with the documented cloud-only allowance.
An earlier missing screenshot read occurred after Playwright cleared old output;
subsequent actual desktop captures were inspected. These earlier failures are
not represented as passes.

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


## Browser timing and diagnostics follow-up

The later metadata run on `5f7708a` failed in Node 22's browser step:
https://github.com/Benzmaks/ai-influencer-studio/actions/runs/41447435239 .
GitHub's public annotation exposed the failed step, but detailed logs/artifact
API access returned Forbidden, so its exact failing assertion is not claimed
as diagnosed. The next unchanged-application run on `7ed7bbe` passed both full
native matrices in 7m 42s:
https://github.com/Benzmaks/ai-influencer-studio/actions/runs/41447653532 .

The committed browser configuration now uses a bounded 15-second assertion
wait, matching the successful local allowance for observed cold-route/async
completion delays, and adds the GitHub reporter in CI so future failures expose
test-level annotations. Assertions, test count, browser projects and recovery/
authorization coverage are unchanged. This addresses the reproduced local
five-second timing limits without pretending the inaccessible hosted trace was
read. The release preview pins this configuration along with the same application
code; final native CI and a complete local run verify it before completion.


A subsequent complete local run reproduced a separate browser-test race: 23/24
passed, but the desktop second-generation assertion observed the first already
completed text-to-video card before the image-to-video request had been appended.
Accessing its intentionally null sourceReference caused a TypeError. The test
now waits for each POST response and tracks that exact new job ID/card and
metadata; it cannot mistake the prior completed batch for the new result. This
fix is stronger than extending a timeout. The historical hosted trace remains
unavailable, so it is not asserted to be the same failure. Final local and native
runs exercise all 24 tests with the corrected request tracking.
