# Phase 1 development

Phase 1 implements projects and basic character identity management. Character DNA, scenes, generation jobs, video, content and automation are not implemented. All provider contracts use labeled, deterministic mock fixtures; no paid AI keys are required.

## Prerequisites and first run

Use the existing checkout (`/workspace/ai-influencer-studio` in Codex Cloud). Tasks are isolated; do not create worktrees unless requested. Use Node **24.19.0** (`nvm use` if available) and npm. Docker Compose is the tested local PostgreSQL/Redis option. You can instead supply reachable PostgreSQL and Redis instances through `.env`.

From the checkout:

```sh
npm ci
npm run env:init
```

`env:init` creates a private ignored `.env` only when absent. It generates a random signing secret and local password without logging either. Open that local file in your editor, choose your own `DEV_AUTH_EMAIL` and a `DEV_AUTH_PASSWORD` of 12–128 characters, and keep them private. Existing `.env` files are preserved. The Compose credentials in `.env.example` are for loopback-only development infrastructure, never production.

```sh
docker compose up -d --wait
npm run db:generate
npm run db:migrate
npm run db:seed
npm run health
npm run dev
```

The development web server listens on port 3000. Open the application using your host's supported port-preview mechanism or a local browser, visit `/login`, and sign in with the values you configured. Do not publish `.env` or use its credentials in chat. Codex onboarding does not provide a public loopback preview link.

After login, visit `/projects`, create a project, then create a character. Edit the background to create version 2, expand version 1 and verify the old text. Archive preserves history and prevents further edits. Switch projects with the header selector. Settings shows the active project's roles and environment health. Member invitations are planned; owners can change/remove existing memberships and cannot remove the final owner.

Once PostgreSQL/Redis are running, `bash scripts/bootstrap.sh` reproduces locked installation, preserves/initializes `.env`, generates Prisma, applies migrations, safely seeds and checks health. It does not reset a database. `npm run db:seed` never updates existing accounts, passwords or projects: changing a password in `.env` does not reset an existing user. Use a new development email for a fresh test account; credential-reset administration is not implemented.

## Processes and persistence

PostgreSQL and Redis use persistent named Compose volumes. `docker compose down` stops services while retaining data; do not add `--volumes` unless intentionally destroying local data. Web processes must restart after environment changes. No BullMQ worker is required in Phase 1: durable generation jobs start in Phase 4. BullMQ is installed as the selected queue dependency, not exposed as a functioning job UI.

`LOCAL_STORAGE_DIR` defaults to `.local/assets`, outside `public/` and ignored by Git. The local storage port authorizes project operations, generates non-overwriting object keys, checks signatures/size, and rejects traversal/symlinks. No public upload/download endpoint or asset library UI exists yet. Mock fixtures under `ai/fixtures/` are small, clearly labeled, repository-owned PNG/MP4 samples. The S3-compatible contract exists; its production transport is not implemented.

## Database and migration decisions

Pinned: Prisma client/CLI **6.19.3** and TypeScript **5.9.3**. The supported default uses Prisma's native library query engine and native schema/migration engine, with no pg adapter passed to PrismaClient. CI explicitly selects `STUDIO_PRISMA_ENGINE=classic` and `PRISMA_CLIENT_ENGINE_TYPE=library`. Native engine downloads require verified access to `binaries.prisma.sh`.

The dependency on pg adapter **7.10.1** is retained only for the explicit, unsupported local experiment needed on the restricted cloud machine. To opt in locally, set both `STUDIO_PRISMA_ENGINE=experimental` and `PRISMA_CLIENT_ENGINE_TYPE=client` in your private `.env`, then regenerate. This selects Prisma 6's unstable WASM schema engine and adapter 7; it is rejected in production and CI and is not upstream compatibility assurance. Do not deploy its generated client. A new release install must regenerate in classic/library mode. See [PR review and migration safety](phase-1-review.md).

Existing migration SQL is preserved byte-for-byte. Never reset a populated database to change engine configuration. The initial migration's transaction, constraints and snapshot update rule remain in force. The experimental adapter splits SQL on semicolons, so procedural migrations require the native path. The schema `url` warning is expected only under the experimental adapter; both config and runtime use `DATABASE_URL`.

Development credentials use bcrypt hashes, Auth.js JWT sessions, and a development-mode guard in both login and production session handling. Auth tables are created for future integrations; JWT credentials sessions do not populate the Session table. Auth.js **5.0.0-beta.32** is pinned for Next.js 16 compatibility. Production OIDC integration remains a deployment gate.

## Validation commands

```sh
npm run lint
npm run typecheck
npm run format:check
npm test
npm run test:integration
npm run test:migrations
STUDIO_PRISMA_ENGINE=classic PRISMA_CLIENT_ENGINE_TYPE=library AUTH_MODE=disabled npm run build
npm run test:production
npm run test:e2e
```

- Unit tests cover mock contracts, failure/progress/cancel handling, environment restrictions and private storage.
- `test:migrations` requires PostgreSQL CREATE DATABASE privileges and operates only on a new uniquely named disposable database, verifying checksums and populated redeployment preservation.
- Integration tests require PostgreSQL migrations. They create uniquely named users/projects, exercise roles, cross-project IDs, immutable snapshots, stale/concurrent writes, archiving, last-owner protection and real storage authorization, then delete only their own fixtures.
- `test:production` starts the built app on port 3001 with development authentication disabled, submits configured development credentials, checks rejection/no session, revokes a previously signed development token and verifies protected APIs return 401. That port must be free.
- Browser tests start/reuse the development server on port 3000, use seeded development credentials, and exercise desktop/mobile workflows. They leave clearly identifiable test-created projects/characters in the development account. Use a disposable database/account for CI. Install Chromium with `npx playwright install --with-deps chromium`. In this cloud machine, the tested alternative is `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e`.
- Browser traces/screenshots are ignored local outputs under `test-results/`. CI retains failure artifacts for seven days; use non-sensitive test data.

The production build must use `AUTH_MODE=disabled STUDIO_PRISMA_ENGINE=classic PRISMA_CLIENT_ENGINE_TYPE=library`. `AUTH_MODE=development` fails environment validation in a production process. `npm start` runs a production build, so Phase 1 intentionally offers no usable production sign-in. `npm run dev` is the supported authenticated preview. No development credential bypass is provided.

## CI

`.github/workflows/ci.yml` defines fresh PostgreSQL/Redis services, random masked test credentials, locked install, generated client, repeated migrations/seed, health, lint/type/format checks, unit/integration tests, production build, production-auth verification and desktop/mobile smoke tests. CI uses only native Prisma engines, including migration-preservation tests. Local execution of these commands is recorded separately from remote GitHub Actions status. Creating the workflow does not establish a successful hosted run.

## Troubleshooting

- **Database unavailable:** start PostgreSQL, verify `DATABASE_URL`, then run `db:migrate`. The studio shows an actionable infrastructure notice rather than silently replacing saved data with demo fixtures.
- **Redis unavailable:** start Redis and verify `REDIS_URL`. Settings and `npm run health` report a failing check; character CRUD does not need a generation worker.
- **Login fails:** check `AUTH_MODE=development`, non-production runtime, a 32+ character `AUTH_SECRET`, the seeded account and exact password. Seed preserves existing password hashes.
- **403 on mutations:** set `AUTH_URL` to the actual browser origin and restart; mutations validate Origin. Do not weaken this check for preview hosts.
- **409 on edit/archive:** another update won or the character was archived. Reload before retrying; previous versions remain intact.
- **Sandbox EPERM:** this cloud sandbox blocks network sockets and tsx IPC. Use supported command escalation while retaining the proxy, CA trust and verification. No secret/token extraction is needed.
- **GitHub PR API denied:** Git read/write and GitHub API access are separate capabilities. The PR operation needs `api.github.com` in the network configuration and usable GitHub API authorization. Recheck after the settings update; do not assume a Git push establishes API permissions.

## Recorded checks

See [phase-1-validation.md](phase-1-validation.md) for the final command outcomes. The master specification remains unchanged. Do not begin Phase 2 until explicitly authorized.

## Phase 2 preview

See [character-system.md](character-system.md), [database.md](database.md) and [phase-2-validation.md](phase-2-validation.md). On the Phase 2 branch run db:generate and db:migrate before restarting the development server so its Prisma client includes CharacterDraft. Existing credentials and project/character data remain unchanged. CI uses the supported native path; the existing local-only experimental configuration is not a production certification.

For visual review, sign in, choose Projects in the header and create/select a project, then Characters → Create character. Complete ten steps, try multiple/custom choices, Save & close and Resume draft, review Character DNA/Visual Bible and save. Edit the saved profile, inspect history, duplicate and archive. The quick identity form remains available; unimplemented non-character modules stay Planned. Mock profiles are templates, not real AI generation.

The user can test on the existing Monterey setup with `tools/mac/Preview Phase 2.command` (downloadable ZIP under downloads). It takes private database/source/environment backups, downloads the pinned implementation snapshot, retains .env/local assets and restarts through the existing local starter. Do not replace the whole working folder with a fresh archive. This preview does not merge the PR, expose the app publicly or begin Phase 3. Backups/credentials must stay on the Mac.

## Phase 3 scene preview

Phase 2 merged into main at `6c877bb`. Phase 3 is isolated on `phase-3-scene-prompt-engine`. After updating source, stop the web server, run `npm ci`, `npm run db:generate`, `npm run db:migrate` and `npm run db:seed`, then restart with `npm run dev -- --hostname 127.0.0.1`. Keep AUTH_URL at the exact private browser origin (normally http://localhost:3000) and retain existing private credentials. No paid keys or Redis worker are needed for Scene Builder. Never expose development login to the public internet.

Sign in → choose/create a project → create or select a complete Character DNA profile → Scenes → Create scene. Choose the pinned version, explore concepts, set custom scene details and Save draft. Reopen from Scenes, use numbered steps to review, add an appearance override and choose canonical/scene-only/permanent routing. Run Check continuity & prepare prompts. Resolve conflicts, inspect positive/negative prompts, then Save ready scene. Edit/save again and expand Immutable scene history to verify earlier choices remain unchanged. Duplicate scene makes an independent draft. Images and Videos remain Planned.

Read [prompt-engine.md](prompt-engine.md), [ai-pipeline.md](ai-pipeline.md) and [phase-3-validation.md](phase-3-validation.md) for boundaries and actual verification evidence. No cloud browser-preview URL is available; the running cloud loopback server is for automated checks. The existing private Monterey setup remains the visual preview route. Its source must be updated explicitly; cloud changes do not automatically change the app on your Mac.
