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

Pinned: Prisma client/CLI **6.19.3**, TypeScript **5.9.3**, and official PostgreSQL driver adapter **7.10.1**. The newer adapter is intentionally pinned: the v6 adapter failed PostgreSQL catalog-name decoding in WASM migrations and leaked pooled connections after rejected concurrent transactions. The pinned adapter/client combination passes type checks, migrations, concurrency tests and clean disconnects. Revalidate this compatibility when upgrading.

`prisma.config.ts` uses Prisma 6's **experimental JavaScript/WASM schema engine** with the official driver adapter. This preserves npm package integrity and avoids native binaries blocked by this cloud network. Client runtime uses the JavaScript engine as well. This is an explicit development choice and production-review risk, not a claim of production certification. Native CLI mode can be selected with `STUDIO_PRISMA_ENGINE=classic` when verified native engines and their destination are available; that alternative was not validated here.

The initial SQL is generated from the Prisma model, wrapped in a transaction, and includes a PostgreSQL rewrite rule preventing updates to historical snapshots. The adapter migration path splits SQL statements on semicolons; do **not** add procedural/dollar-quoted migration bodies without first selecting and validating a compatible migration engine. Keep applied migrations immutable. Prisma's warning that schema `url` is ignored by the adapter is expected: both config and runtime explicitly use `DATABASE_URL`.

Development credentials use bcrypt hashes, Auth.js JWT sessions, and a development-mode guard in both login and production session handling. Auth tables are created for future integrations; JWT credentials sessions do not populate the Session table. Auth.js **5.0.0-beta.32** is pinned for Next.js 16 compatibility. Production OIDC integration remains a deployment gate.

## Validation commands

```sh
npm run lint
npm run typecheck
npm run format:check
npm test
npm run test:integration
AUTH_MODE=disabled npm run build
npm run test:production
npm run test:e2e
```

- Unit tests cover mock contracts, failure/progress/cancel handling, environment restrictions and private storage.
- Integration tests require PostgreSQL migrations. They create uniquely named users/projects, exercise roles, cross-project IDs, immutable snapshots, stale/concurrent writes, archiving, last-owner protection and real storage authorization, then delete only their own fixtures.
- `test:production` starts the built app on port 3001 with development authentication disabled, submits configured development credentials, checks rejection/no session and verifies protected APIs return 401. That port must be free.
- Browser tests start/reuse the development server on port 3000, use seeded development credentials, and exercise desktop/mobile workflows. They leave clearly identifiable test-created projects/characters in the development account. Use a disposable database/account for CI. Install Chromium with `npx playwright install --with-deps chromium`. In this cloud machine, the tested alternative is `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e`.
- Browser traces/screenshots are ignored local outputs under `test-results/`. CI retains failure artifacts for seven days; use non-sensitive test data.

The production build must use `AUTH_MODE=disabled`. `AUTH_MODE=development` fails environment validation in a production process. `npm start` runs a production build, so Phase 1 intentionally offers no usable production sign-in. `npm run dev` is the supported authenticated preview. No development credential bypass is provided.

## CI

`.github/workflows/ci.yml` defines fresh PostgreSQL/Redis services, random masked test credentials, locked install, generated client, repeated migrations/seed, health, lint/type/format checks, unit/integration tests, production build, production-auth verification and desktop/mobile smoke tests. Local execution of these commands is recorded separately from remote GitHub Actions status. Creating the workflow does not establish a successful hosted run.

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
