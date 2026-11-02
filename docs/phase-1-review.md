# Phase 1 PR #1 review

Review scope: compatibility, migration safety, authentication, CI and existing project/snapshot invariants. No Phase 2 work or merge is authorized.

## Verified findings

1. **The mixed-major Prisma stack is not a supported release baseline.** The installed client/CLI are 6.19.3, the pg adapter and its driver-adapter-utils are 7.10.1, and Prisma 6's configuration declarations explicitly label the JavaScript schema engine unstable. npm accepting the packages and a passing local suite do not prove upstream support across major versions. The prior claim that the newer adapter completely fixed connection cleanup was too strong: a hosted push check still timed out in integration teardown.
2. **The safest immediate migration strategy is native Prisma 6.19.3, with the matching Prisma 6.19.3 client runtime.** This avoids both adapter 7 and the unstable schema engine in the default path. `prisma.config.ts` now defaults to `engine: classic`, the schema generates the native library client, and the database module uses PrismaClient without a driver adapter. No ORM major upgrade or schema reset is needed.
3. **The previous WASM/adapter path is isolated as an explicit local experiment.** It requires `STUDIO_PRISMA_ENGINE=experimental` and `PRISMA_CLIENT_ENGINE_TYPE=client` during generation, emits a warning, and is rejected in production and CI. It is a constrained local workaround, not a release-readiness result. The cloud network still denies native engine downloads; requesting the required destination does not itself grant access.
4. **Auth.js remains a pinned beta, not production authentication.** next-auth 5.0.0-beta.32 declares Next.js 16 and React 19 peer compatibility; both Auth.js integrations resolve to @auth/core 0.41.3. Credentials require explicit development mode, bcrypt verification and server-only access. Production startup rejects development authentication. JWT callbacks now also revoke pre-existing development tokens when the mode is disabled or the process is production. Production OIDC, operational login controls and production sign-in remain unimplemented.
5. **Snapshot and project protections remain in force.** Character edits append versions, optimistic revisions serialize competing edits, archive preserves history, the database rule blocks snapshot updates, and composite foreign keys constrain current-version ownership. Server-side membership checks and serializable last-owner protection are retained. No original SQL migration was edited and no existing database was reset.

## Observed hosted checks before this review

Public GitHub job summaries provide evidence despite the blocked API:

- [Push run 41379036262](https://github.com/Benzmaks/ai-influencer-studio/actions/runs/41379036262): **failed**, integration `afterAll` hook timed out at 15 seconds.
- [PR run 41379371535](https://github.com/Benzmaks/ai-influencer-studio/actions/runs/41379371535): **succeeded** for the same original head `d69a674`.

These conflicting outcomes expose an intermittent failure, not a reliable all-green original baseline. The review changes CI to the native Prisma path, pins Ubuntu 24.04 to avoid the runner-image transition, and updates checkout/setup-node/upload-artifact to their Node-24 generation. It does not mask the failing assertions or raise the teardown timeout.

## Non-destructive migration procedure

1. Back up the target database with `pg_dump -Fc` to a private location and exercise restoration into a separate database. Do not print or commit dump contents or credentials.
2. Keep `prisma/migrations/202611020001_foundation/migration.sql`, migration directory names, and `_prisma_migrations` intact. Do not run reset, recreate a populated schema, regenerate an initial migration, delete migration history, or use `db push` to bypass history.
3. Use the pinned Node/npm lockfile with native engine access and verification enabled. Set `STUDIO_PRISMA_ENGINE=classic` and `PRISMA_CLIENT_ENGINE_TYPE=library`, run `npm ci` and `npm run db:generate` in the release environment; never ship an experimental local generated client.
4. Run `npm run test:migrations` against infrastructure where the account can create a disposable database. It applies all existing migrations, checks their recorded SHA-256 checksums, creates populated character history, redeploys and asserts unchanged versions, canonical pointers, memberships and migration rows. It tests the snapshot update rule and drops only the uniquely named database it created.
5. On the backed-up target run `prisma migrate status`, then `npm run db:migrate` (`migrate deploy`), then `prisma migrate status` again. The existing schema needs no new relational migration for this engine-selection change. New schema changes must use new additive, reviewed migrations.
6. Confirm row counts/checksums and representative character history, authorization and application readiness after deployment. Retain the backup until verification completes. Native handling of procedural SQL avoids the experimental adapter's semicolon-splitting limitation; custom rules must still be reviewed in future migrations.

A failed or partially applied migration needs inspection of its recorded error and transaction outcome. Use `migrate resolve` only after establishing the real schema state; do not mark it applied to silence an error. PostgreSQL versions, extensions and role privileges must be checked on the actual target.

## Validation and limitations

Current-instance development tests use the explicit experimental fallback because native downloads are denied. They validate application/auth behavior and migration preservation, but do not certify the native migration engine locally. The native path passed the updated hosted CI at review implementation commit `ce7e7b874fe55c2ec577c947877f29e00b3b98cd`: [push run 41381930864](https://github.com/Benzmaks/ai-influencer-studio/actions/runs/41381930864) succeeded in 2m 27s, and [PR run 41381935739](https://github.com/Benzmaks/ai-influencer-studio/actions/runs/41381935739/job/125074417832) succeeded in 2m 29s. These include fresh/repeated migrations, the populated migration-preservation regression, eight authorization/snapshot integration tests, 23 unit tests, the production build and signed-session rejection checks, and four desktop/mobile browser tests. Job success was read from public GitHub summaries; raw logs/API remain inaccessible. The native path's absence of adapter 7 removes the identified mixed-major boundary; a fully aligned Prisma 7 upgrade would be a separate, planned compatibility change and is not needed for Phase 1.

Production remains blocked on OIDC and deployment-specific controls; the beta pin must be reviewed again before enabling production login. GitHub API calls are still denied by the current proxy. Git pushes and public read-only CI summaries work; a PR body/comment edit requires the connected integration or restored API access. Pushes update PR #1's code and documentation without merging it.

## Evidence sources

- Installed `@prisma/config/dist/index.d.ts` marks `SchemaEngineConfigJs` unstable and requires the experimental adapter gate.
- `package-lock.json` and `npm ls` establish the exact Prisma and deduplicated Auth.js core versions. Installed adapter metadata does not promise cross-major compatibility.
- Installed `next-auth/package.json` supplies the Next.js/React peer ranges; `@auth/core` sources confirm default secure-cookie selection from HTTPS and unchanged CSRF handling. No skip-CSRF or permissive redirect override was introduced.
- Original migration SHA-256 remains `34da05cf4eba97d4d46ce39d19b30382bbb95513af8b370cc5a38bcd8309fb26`; no migration or master-specification diff exists relative to the original PR head.
- Local checks passed with explicit experimental development opt-in; the separately observed hosted native runs above establish the release/default-path checks. No production deployment or backup restoration of a real target was performed.
