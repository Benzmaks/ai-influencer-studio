# Development environment

Phases 1–5 are merged. Phase 6 Video Studio is implemented for review on `phase-6-video-studio`. The reproducible commands, tested versions, migration constraints and troubleshooting are in [development.md](development.md). No paid AI credentials are required. Production deployment remains out of scope.

## Runtime and dependencies

Node 24.19.0/npm, Next.js 16.4.3 App Router, React 19.3.1, TypeScript 5.9.3, Prisma client/CLI 6.19.3, native Prisma engines (with matching pg adapter 6.19.3 retained only for an explicitly experimental local query-engine path), PostgreSQL 17.6 and Redis 7.4.6. Auth.js 5.0.0-beta.32 uses JWT credentials sessions in development. Zod validates inputs, bcrypt hashes local passwords, Vitest and Playwright validate behavior. BullMQ media workers/outbox handle images and Phase 6 per-shot video previews; Redis is required for asynchronous media generation. Native Prisma is required for migrations.

`compose.yaml` starts loopback-bound PostgreSQL/Redis with health checks and retained data volumes. Existing managed services can be selected instead. Never use the sample Compose password in production. Local private asset files live under `.local/assets`; the S3-compatible production interface is defined but its transport is planned.

## Environment variables

Use `npm run env:init` or copy `.env.example` to an ignored `.env` and securely fill missing values. No credential may be exposed through a `NEXT_PUBLIC_` variable.

| Variable                                                | Required behavior                                                                                                                       |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                          | PostgreSQL connection string; server/CLI only. Protect credentials and use service-required TLS.                                        |
| `REDIS_URL`                                             | Redis connection string; server only. Use authentication/TLS for managed deployments.                                                   |
| `AUTH_SECRET`                                           | At least 32 random characters; session-signing secret, never tracked or logged.                                                         |
| `AUTH_URL`                                              | Actual application/browser origin; used for callbacks and mutation Origin validation.                                                   |
| `AUTH_MODE`                                             | `development` only for non-production local login; `disabled` for production build/start. Production OIDC is not implemented.           |
| `DEV_AUTH_EMAIL`, `DEV_AUTH_PASSWORD`                   | Non-production seed/login values; password 12–128 characters. Seed never overwrites existing accounts.                                  |
| `LANGUAGE_PROVIDER`, `IMAGE_PROVIDER`, `VIDEO_PROVIDER` | `mock` only in the current implementation. Unknown providers fail configuration validation.                                                                |
| `STORAGE_DRIVER`                                        | `local` only in the current implementation; unsupported drivers fail validation.                                                                           |
| `LOCAL_STORAGE_DIR`                                     | Private writable persistent directory, never inside `public/`. Defaults to `.local/assets`.                                             |
| `STUDIO_PRISMA_ENGINE`                                  | `classic` is the supported default. `experimental` opts into the unsupported local WASM/adapter path and is forbidden in production/CI. |
| `PRISMA_CLIENT_ENGINE_TYPE`                             | `library` for native default/releases; `client` only for local experimental generation. Never deploy the experimental generated client. |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE`                        | Optional system Chromium path for local tests; CI installs the matching Playwright browser.                                             |

S3 credentials/selectors, real AI provider keys, production OIDC configuration and paid-provider retry tuning are future configuration requirements when those features are implemented. They are not current required inputs. No `fixture-demo` is implemented: unavailable infrastructure produces explicit errors rather than silent fallback. Mock providers replace external AI only; project data and authorization use actual PostgreSQL.

## Startup and health

See [development.md](development.md) for the full sequence. After `npm ci`, environment initialization and infrastructure startup, run `db:generate`, `db:migrate`, `db:seed`, `health`, then `dev`. `npm run health` validates configuration, database connectivity/schema, Redis PING and a private filesystem write/readiness probe. Authenticated users can inspect `/settings` or `/api/health`. Unauthenticated clients cannot inspect infrastructure diagnostics.

Processes must restart in future cloud tasks. Installed dependencies, database volumes and local files are distinct from running web/container processes. Run `npm run worker` in a separate process for images/videos; the private Mac starter manages it automatically. The build command is `STUDIO_PRISMA_ENGINE=classic PRISMA_CLIENT_ENGINE_TYPE=library AUTH_MODE=disabled npm run build`; authenticated preview uses development mode and `npm run dev`.

## Codex Cloud

Use the existing checkout at `/workspace/ai-influencer-studio`; do not create worktrees unless requested. Inspect current network policy and variable presence without printing secret values. Preserve platform Git proxy authentication, TLS and package checksums. Networked commands, Docker and tsx IPC required supported sandbox escalation on this machine.

Native Prisma is the supported default and requires `binaries.prisma.sh`. The current cloud policy denies that destination, so local tests explicitly opt into the unsupported WASM/adapter experiment. Production and CI reject that fallback. No verification is disabled. See [the review](phase-1-review.md) for migration preservation and observed hosted results. `api.github.com` is a separate required destination for creating/checking pull requests; successful Git pushes do not prove API access. Review/save draft changes in environment settings and publish when requested; a saved draft alone does not apply runtime policy or publish a filesystem snapshot.

Tested installation/startup instructions should be retained in cloud configuration. Publication can preserve files but not live processes or sessions. Restart and validate services after restoration; no fresh-task restoration has been verified by the local checks.

## Production gates

Select and implement production OIDC, hosting for web and durable workers, private S3-compatible transport, budgets/quotas, backups/restoration, retention/deletion, upload processing and monitoring before claiming production readiness. Review the pinned Auth.js beta and experimental Prisma migration path. Serverless local disk cannot be production asset storage. The current build intentionally refuses development credentials in production. No production deployment was performed.
