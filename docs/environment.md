# Development environment

Phase 1 is implemented on the `phase-1-foundation` branch. The reproducible commands, tested versions, migration constraints and troubleshooting are in [development.md](development.md). No paid AI credentials are required. Production deployment remains out of scope.

## Runtime and dependencies

Node 24.19.0/npm, Next.js 16.4.3 App Router, React 19.3.1, TypeScript 5.9.3, Prisma client/CLI 6.19.3, official pg driver adapter 7.10.1, PostgreSQL 17.6 and Redis 7.4.6. Auth.js 5.0.0-beta.32 uses JWT credentials sessions in development. Zod validates inputs, bcrypt hashes local passwords, Vitest and Playwright validate behavior. BullMQ is installed; worker/job implementation belongs to Phase 4.

`compose.yaml` starts loopback-bound PostgreSQL/Redis with health checks and retained data volumes. Existing managed services can be selected instead. Never use the sample Compose password in production. Local private asset files live under `.local/assets`; the S3-compatible production interface is defined but its transport is planned.

## Environment variables

Use `npm run env:init` or copy `.env.example` to an ignored `.env` and securely fill missing values. No credential may be exposed through a `NEXT_PUBLIC_` variable.

| Variable                                                | Required behavior                                                                                                                                                |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                          | PostgreSQL connection string; server/CLI only. Protect credentials and use service-required TLS.                                                                 |
| `REDIS_URL`                                             | Redis connection string; server only. Use authentication/TLS for managed deployments.                                                                            |
| `AUTH_SECRET`                                           | At least 32 random characters; session-signing secret, never tracked or logged.                                                                                  |
| `AUTH_URL`                                              | Actual application/browser origin; used for callbacks and mutation Origin validation.                                                                            |
| `AUTH_MODE`                                             | `development` only for non-production local login; `disabled` for production build/start. Production OIDC is not implemented.                                    |
| `DEV_AUTH_EMAIL`, `DEV_AUTH_PASSWORD`                   | Non-production seed/login values; password 12–128 characters. Seed never overwrites existing accounts.                                                           |
| `LANGUAGE_PROVIDER`, `IMAGE_PROVIDER`, `VIDEO_PROVIDER` | `mock` only in Phase 1. Unknown providers fail configuration validation.                                                                                         |
| `STORAGE_DRIVER`                                        | `local` only in Phase 1; unsupported drivers fail validation.                                                                                                    |
| `LOCAL_STORAGE_DIR`                                     | Private writable persistent directory, never inside `public/`. Defaults to `.local/assets`.                                                                      |
| `STUDIO_PRISMA_ENGINE`                                  | Default development WASM adapter path; `classic` opts into native Prisma CLI engine and requires verified binary availability. Classic mode is unvalidated here. |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE`                        | Optional system Chromium path for local tests; CI installs the matching Playwright browser.                                                                      |

S3 credentials/selectors, real AI provider keys, production OIDC configuration and generation retry tuning are future configuration requirements when those features are implemented. They are not current required inputs. No `fixture-demo` is implemented: unavailable infrastructure produces explicit errors rather than silent fallback. Mock providers replace external AI only; project data and authorization use actual PostgreSQL.

## Startup and health

See [development.md](development.md) for the full sequence. After `npm ci`, environment initialization and infrastructure startup, run `db:generate`, `db:migrate`, `db:seed`, `health`, then `dev`. `npm run health` validates configuration, database connectivity/schema, Redis PING and a private filesystem write/readiness probe. Authenticated users can inspect `/settings` or `/api/health`. Unauthenticated clients cannot inspect infrastructure diagnostics.

Processes must restart in future cloud tasks. Installed dependencies, database volumes and local files are distinct from running web/container processes. No worker startup is required yet. The tested build command is `AUTH_MODE=disabled npm run build`; authenticated preview uses development mode and `npm run dev`.

## Codex Cloud

Use the existing checkout at `/workspace/ai-influencer-studio`; do not create worktrees unless requested. Inspect current network policy and variable presence without printing secret values. Preserve platform Git proxy authentication, TLS and package checksums. Networked commands, Docker and tsx IPC required supported sandbox escalation on this machine.

The original Prisma binary destination was denied. The tested npm-distributed WASM schema engine and official PostgreSQL adapter avoid that download, with experimental migration-mode limitations explicitly documented. No verification is disabled. `api.github.com` is a separate required destination for creating/checking pull requests; successful Git pushes do not prove API access. Review/save draft changes in environment settings and publish when requested; a saved draft alone does not apply runtime policy or publish a filesystem snapshot.

Tested installation/startup instructions should be retained in cloud configuration. Publication can preserve files but not live processes or sessions. Restart and validate services after restoration; no fresh-task restoration has been verified by the local checks.

## Production gates

Select and implement production OIDC, hosting for web and durable workers, private S3-compatible transport, budgets/quotas, backups/restoration, retention/deletion, upload processing and monitoring before claiming production readiness. Review the pinned Auth.js beta and experimental Prisma migration path. Serverless local disk cannot be production asset storage. The current build intentionally refuses development credentials in production. No production deployment was performed.
