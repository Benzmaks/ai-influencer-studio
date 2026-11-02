# Phase 1 validation record

Validated in the current Codex Cloud instance on 2026-11-02. These are executed local outcomes, not claims about hosted GitHub Actions, production deployment or restoration in a new task.

| Check                                                               | Final outcome                                                                                                                        |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `npm ci`                                                            | Passed; locked installation completed.                                                                                               |
| `npm run db:generate`                                               | Passed with pinned JS client/schema engine configuration.                                                                            |
| Fresh PostgreSQL migration                                          | Passed; initial schema applied with composite foreign keys, immutable-version protection and constraints.                            |
| Repeated `npm run db:migrate`                                       | Passed; no pending migrations.                                                                                                       |
| Repeated `npm run db:seed`                                          | Passed; existing accounts/projects preserved.                                                                                        |
| `npm run env:init` with existing `.env`                             | Passed; file preserved.                                                                                                              |
| `npm run health`                                                    | Passed: configuration, PostgreSQL/schema, Redis and storage ready.                                                                   |
| Redis unavailable / restored                                        | Expected failing exit with “Start Redis and check REDIS_URL”; service restored and health passed.                                    |
| `npm run lint`                                                      | Passed.                                                                                                                              |
| `npm run typecheck`                                                 | Passed.                                                                                                                              |
| `npm run format:check`                                              | Passed; framework-generated declarations excluded.                                                                                   |
| `npm test`                                                          | 16 tests passed across three unit suites; zero skipped.                                                                              |
| `npm run test:integration`                                          | Eight tests passed, including cleanup; zero skipped.                                                                                 |
| `AUTH_MODE=disabled npm run build`                                  | Passed; production routes compiled and static pages generated.                                                                       |
| `npm run test:production`                                           | Passed against real production process: login disabled, development credentials rejected, no authenticated session, project API 401. |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e` | Four tests passed: desktop/mobile unauthorized access and authenticated workflows; zero skipped.                                     |
| Mock video inspection                                               | ffprobe confirms a valid two-second MP4 fixture; PNG and MP4 signatures also tested.                                                 |
| Visual review                                                       | Dashboard screenshot inspected; responsive layouts checked in browser tests.                                                         |
| Master specification                                                | Byte-for-byte equality with original uploaded text verified.                                                                         |
| Hosted GitHub Actions                                               | Unavailable for verification while GitHub API access is blocked; workflow is committed, not reported as remotely passed.             |
| Native Prisma CLI engine alternative                                | Unrun after native-download denial; optional classic-mode alternative is documented.                                                 |
| Paid AI, S3 production transport, OIDC deployment, later phases     | Intentionally unrun/out of scope; no paid credentials used.                                                                          |

## Exercised behavior

Browser workflow signs in, creates two projects, selects between them, creates a character, edits to a second snapshot, expands the unchanged first snapshot, visits all six planned creative modules and Settings, checks authenticated health, rejects a foreign mutation Origin, archives and reloads to confirm history remains. Both mobile and desktop run the workflow. Unauthenticated studio requests redirect to login and project APIs return 401.

Integration checks cover owner/editor/viewer permissions, cross-project reads/writes, optimistic stale/concurrent updates, database-level snapshot update prevention, archive preservation, last-owner protection under concurrent role changes and project-authorized storage. Fixture cleanup finishes successfully.

Unit checks cover deterministic language/image/video mock contracts, batch sizes, source/capability constraints, cancellation/progress/error injection, production login guards, safe environment diagnostics, signature/size validation, non-overwriting storage, denied access, cross-project keys, traversal and symlink rejection.

## Failures investigated and corrected

- Native Prisma engine download denied by the network: use npm-verified JS/WASM tooling without disabling TLS or checksums.
- Prisma v6 pg adapter failed catalog-name decoding and leaked connections after rejected transactions: pin the tested official v7.10.1 pg adapter; migration mode remains an explicitly documented experimental production-review item.
- Initial procedural SQL conflicted with adapter statement splitting: the successful initial migration uses atomic SQL and a database rewrite rule. No applied migration was subsequently rewritten.
- Browser edit-form label included textarea default text: use an explicit separate accessible label.
- Production verification initially assumed an empty object for unauthenticated sessions: Auth.js returns null; the assertion now checks absence of a user correctly against the real server.
- Generated Next.js declaration formatting was excluded from source formatting checks.

There are no unresolved failures in the local required application checks. Remaining review items are the pinned Auth.js beta, Prisma adapter/migration compatibility and production-specific integrations. GitHub API network access remains an external workflow blocker; its required `api.github.com` addition is saved in the environment draft. Saving does not apply or publish configuration. See [development.md](development.md) for reproducible commands and [environment.md](environment.md) for configuration.

## PR #1 review supersedes compatibility claims

See [phase-1-review.md](phase-1-review.md). The historical local runs above do not establish supported mixed-major compatibility: the hosted push run later exposed a teardown timeout, while the original PR run passed. Native Prisma 6 is now the default in CI/releases; the unsupported adapter/WASM path requires explicit local opt-in. Original migration SQL is unchanged. Review-time checks include 23 unit tests, eight project/snapshot integration tests and an isolated populated-database migration-preservation check. Native hosted results are recorded in the review after completion.

Native CI for review implementation commit `ce7e7b8` is now verified: [push run](https://github.com/Benzmaks/ai-influencer-studio/actions/runs/41381930864) and [PR run](https://github.com/Benzmaks/ai-influencer-studio/actions/runs/41381935739) both succeeded. Both use native Prisma 6 migration/query engines, the migration-preservation check, 23 unit tests, eight integration tests, four browser tests and production session rejection. These supersede the earlier unknown hosted status; the original failed run remains part of the historical record.
