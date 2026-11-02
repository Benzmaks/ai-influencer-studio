# Phase 4 verification

Phase 3 merge verified from fetched main `cff65c0`, with Phase 3 head `fbdaa2f` confirmed as an ancestor. Work is isolated on phase-4-image-generation. Implementation spans `bb7e167` and `6556bc8`; the downloadable Mac updater pins the complete source at `6556bc8bf19cc32613375d009b933d7352cb14ec`. Nothing was merged and no Phase 5 work was performed.

## Successful local checks

- Locked `npm ci` after aligning Prisma client/CLI/pg adapter to 6.19.3; client generation, lint, TypeScript, formatting and diff whitespace checks passed.
- 43 unit tests in seven suites passed, including original contracts plus deterministic, distinct raster output, actual PNG decoding/dimensions, aspect ratios, mock labels, source/strength behavior and strict request validation. The same 43 tests also passed under the official Node 22.23.4 compatibility runtime after the adapter alignment.
- 30 PostgreSQL/Redis integration tests in four suites passed with the aligned adapter. They cover original foundation/DNA/scene behavior, concurrent idempotent creation, changed-payload conflict, outbox atomicity, 1/2/4/8 results, exact prompt/version metadata, signature anchors, role/project/source constraints, actual storage/download checksums, review actions, cancellation and late-result fencing, partial failures, bounded automatic/manual retries, active quotas, competing consumers, abandoned leases, outbox repair and repeated disconnect/reconnect.
- Recovery includes an actual child BullMQ worker killed with SIGKILL while processing, restarted against the same queue, and observed completing the pending slot through stalled-job recovery without duplicate result records.
- The final aligned desktop/mobile browser run passed 16/16 tests, covering all Phase 1–3 workflows plus the visible Create Character → Create Scene → Generate Mock Images → Review Gallery → Favourite/Reject → Download chain, all four batch counts and source variations. PNG download bytes and filename were checked. The final run completed in 3.1 minutes with the corrected committed source.
- Production webpack build and a real production-process authentication check passed again with the aligned dependencies: development credentials rejected, session absent, pre-existing development token revoked and project API returns 401.
- Configuration, PostgreSQL, Redis and private storage health checks passed. Separate loopback Next.js and mock image worker processes start successfully.
- The additive image migration applied successfully before the adapter alignment. The populated disposable-database regression passed Phase 1 → Phase 2 → Phase 3 → Phase 4, preserving original snapshots, draft, scene history, pointers, memberships and migration checksums on repeat deployment. The foundation migration SHA256 remains `34da05cf4eba97d4d46ce39d19b30382bbb95513af8b370cc5a38bcd8309fb26`.
- Mac shell syntax, ZIP integrity/expected entries, official pinned Redis source download/checksum and fixed source commit were checked. No secret/database files are packaged. Redis builds use a space-free temporary directory and copy binaries locally; no Docker, Homebrew or sudo is required.

## Corrected failures and limits

Initial integration runs found a nested insert project field inherited from its parent and strict parsing of a richer stored input snapshot; both were fixed and rerun. The first browser run counted a UI icon as an image in its final filter assertion; the assertion now targets the labeled mock outputs. No generation/download functionality was mocked in the browser workflow.

Repeated local transaction/shutdown checks exposed connection leakage with the old Prisma 6 client/7 adapter experiment. The adapter is now aligned to 6.19.3 and cached-client shutdown clears the lazy client reference; runtime integration and reconnect checks pass. This alignment exposes the unstable WASM migration engine's inability to deserialize PostgreSQL catalog type `name`: the final local migration regression attempt **failed** with that explicit error. Native/classic migration engines remain the supported path, used by CI and the Mac launcher. Native engine downloads are restricted in this cloud environment. Do not treat earlier experimental migration success as final native certification or restore the mixed-major adapter to bypass the issue.

The first hosted push (`bb7e167`, run 41415086051) failed typecheck because the already-tested local worker directory was omitted from that commit. `6556bc8` includes those modules. The updater was repinned to the complete source; corrected hosted CI must be checked independently before reporting success.

Physical Monterey Redis compilation, actual updater execution and backup restoration were unavailable. No paid-provider tests were run; paid providers are disabled. Production OIDC remains unimplemented and development authentication must stay private. No end-user cloud port preview is available; the running cloud loopback is for automated verification, not a link to the user's Mac.

Object storage is not transactional with PostgreSQL: a hard kill in the narrow post-write/pre-reference window may leave a private orphan object. Fenced commits prevent exposure as a result; automated orphan cleanup/retention remains unimplemented. Collections, image editing and full version-tree UI remain out of scope. See image-generation.md.

## Final browser and hosted CI evidence

Final aligned browser: 16/16 passed. Corrected hosted native CI: https://github.com/Benzmaks/ai-influencer-studio/actions/runs/41415547867 . Its conclusion is verified before reporting native success; see the final report for the latest review-head run status.

## Monterey launcher follow-up

The user's actual Mac run exposed a launcher relocation error: copied foundation scripts under `.local` still resolved their directory as the application root, attempting `.local/source/.env`. The updater now adjusts only the exact original directory line in both foundation launchers to their parent directory. The patch is idempotent and leaves credentials/data untouched. A shell regression check verified both launcher headers from another working directory with spaces in the Studio path, plus repeated application; ZIP integrity and Bash syntax also passed. Full physical Mac startup still requires the user's retry. Native CI for the original final implementation `98573a9` passed: https://github.com/Benzmaks/ai-influencer-studio/actions/runs/41416145343 .
