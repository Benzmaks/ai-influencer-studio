# Environment and development setup

Status: planned setup contract. This documentation milestone installs no dependencies and creates no application or infrastructure configuration. Commands below describe the intended Phase 1 workflow; scripts, migrations and example configuration must be implemented and tested before being called working setup.

## Required components

- A compatible active Node.js LTS and npm, with versions pinned during Phase 1 after compatibility checks. Commit `package-lock.json`; future installation uses `npm ci`.
- Next.js App Router, React and TypeScript; PostgreSQL with Prisma client/CLI; Redis and BullMQ; Auth.js and a maintained password-hashing library for development credentials.
- Runtime validation such as Zod; a test runner such as Vitest, browser smoke tests with Playwright, and ESLint/TypeScript checks.
- An S3 client when implementing the production storage adapter, and provider SDKs only for selected real integrations. No paid SDK credentials are required for mocks.

PostgreSQL and Redis are required for the complete persistence/job workflow. Phase 1 should supply pinned Docker Compose services for local development, with persistent database volumes, health checks and non-production credentials, plus instructions for using externally managed instances instead. Container setup is not assumed available on every host. Inspect actual Docker support before selecting it in Codex Cloud; follow cloud runtime proxy/CA guidance if containers are used.

## Configuration contract

Suggested names are application variables, not existing bindings. Never commit secret values or put credentials in public-prefixed variables. Provide an `.env.example` with names/non-secret examples in Phase 1; preserve existing local files.

| Variable | Purpose and handling |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string; secret, server/worker only. Require production TLS according to database service guidance. |
| `REDIS_URL` | Redis connection string; secret where authenticated, server/worker only. Use TLS when required. |
| `AUTH_SECRET` | Session-signing secret; securely configured, never generated into tracked files. |
| `AUTH_URL` | Non-secret application origin for authentication callbacks. |
| `AUTH_MODE` | `development` for guarded local credentials; production uses the selected OIDC integration. |
| `DEV_AUTH_EMAIL`, `DEV_AUTH_PASSWORD` | Local seed/login configuration; password secret, development-only. Never universal production credentials. |
| `LANGUAGE_PROVIDER`, `IMAGE_PROVIDER`, `VIDEO_PROVIDER` | Default `mock`; invalid/unsupported choices fail validation. |
| `STORAGE_DRIVER` | `local` in development, `s3` for production. |
| `LOCAL_STORAGE_DIR` | Ignored persistent asset directory outside public static files, e.g. `.local/assets`. |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET` | Non-secret production object storage selectors; endpoint must be validated. |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Server-side storage credentials if injected workload identity is unavailable. |
| `GENERATION_MAX_ATTEMPTS` | Default three total attempts; validated hard bounds and separate handling for ambiguous outcomes. |
| `APP_MODE` | Normal persisted development by default; optional explicitly labeled `fixture-demo` UI mode. Production must reject fixture-demo. |

Provider credential variable names and destination hosts are selected when a real adapter is chosen; do not invent a required provider or request unused credentials. Prefer names compatible with cloud platform reserved-name restrictions. Production OIDC needs issuer/client configuration and callback registration appropriate to the chosen integration. Neither OIDC nor paid AI credentials is required to develop the mock application locally.

## Planned developer workflow

Use the existing checkout at `/workspace/ai-influencer-studio`; cloud tasks are already isolated. Do not create a Git worktree unless explicitly requested.

Once Phase 1 creates and verifies the scripts:

1. Activate the pinned Node version, install with `npm ci` and supply environment values securely.
2. Start PostgreSQL and Redis using the documented Compose services or configured external endpoints; verify their health and connectivity from the actual runtime.
3. Run Prisma migration deployment against the local development database, generate the Prisma client as required and run an idempotent development seed. Seed must not overwrite user projects or create production development credentials.
4. Start Next.js development web process from the checkout; start the separate worker when asynchronous features are introduced. Keep worker/server logs outside tracked source and redact sensitive values.
5. Log in through development authentication, create/select a project, create/update a character, restart and verify persistence. When jobs exist, submit a mock job and verify a completed asset through an authorized request; an open port alone is insufficient.
6. Run tests, lint, type check, production build and browser smoke checks. CI uses fresh PostgreSQL/Redis services, locked dependencies and migrations; no paid provider access.

Expected script names to establish are `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`, `db:generate`, `db:migrate`, `db:seed` and, when needed, `worker`. These scripts do not exist yet. Publish exact tested commands and working directories in `docs/development.md` during Phase 1.

## Infrastructure failures and supported fallback

With PostgreSQL/Redis available, mock providers simulate generation while using real persisted records and worker lifecycle. Mock mode replaces external AI, not authentication, authorization or persistence.

If infrastructure is unavailable, show actionable connection/health errors and document how to supply local or managed services. An explicit fixture-demo may support UI design with deterministic in-memory fixtures, clearly labeled non-persistent demo data and simulated jobs. It must not silently replace normal mode, claim database/queue validation, accept paid provider credentials, or be enabled in production. Database/queue integration gates remain outstanding until actual services pass checks. This fallback is planned, not currently implemented.

## Codex Cloud considerations

- Inspect current environment status, network policy, variable names/presence and existing bindings without printing values. Preserve injected proxy/authentication and TLS verification. Use the existing HTTPS Git proxy; a missing raw GitHub token is not evidence of missing access.
- At the documentation milestone Git read/write worked outside the command sandbox; sandboxed requests could not connect to the proxy. Use supported sandbox escalation where necessary rather than bypassing the proxy. Repository access is confirmed, but database/Redis/Docker/application readiness has not been tested.
- Request only demonstrated missing destinations/credentials through environment settings. Local PostgreSQL/Redis may need no external destinations; managed services need supported network access appropriate to their protocol. HTTP allowlisting alone does not establish PostgreSQL/Redis TCP access.
- Save tested dependency/bootstrap steps as the cloud `install_script` and web/worker restart plus readiness instructions as `start_skill` once Phase 1 implements them. Do not save fictional commands as verified setup now.
- Published snapshots may preserve installed files but do not preserve running processes, sessions or live connections. Restart services and validate them in future tasks. Saving a configuration draft does not execute or publish it.

## Deployment assumptions and gates

Development uses local storage; production requires private S3-compatible storage and a durable worker host. Local files on ephemeral/serverless instances are insufficient. Plan separate web/worker deployments sharing PostgreSQL, Redis and object storage; never expose infrastructure ports publicly by default. Apply schema migrations as a controlled release step and verify web/worker schema compatibility.

Production requires selected OIDC authentication, secure cookies/TLS, least-privilege service access, upload limits, quotas, backups/restoration tests, monitoring and retention/deletion rules. Exact hosts, providers, resource sizing and recovery objectives remain unresolved. No production deployment or environment publication is part of this milestone.
