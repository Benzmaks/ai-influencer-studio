# AI Influencer Studio

A considered creative workspace for fictional characters and their visual/social content.

The foundation provides a responsive Next.js studio, authenticated projects, server-enforced project roles, basic character creation/editing/archiving and immutable identity history. Deterministic mock provider and private-storage foundations require no paid AI keys. Scenes, image/video generation, content, assets UI and automation are clearly marked **Planned**.

Start with [Development setup](docs/development.md), [Environment](docs/environment.md) and [Validation results](docs/phase-1-validation.md). Requirements and roadmap: [Master specification](docs/product-specification.md), [Architecture](docs/architecture.md), [Implementation plan](docs/implementation-plan.md), [Data model](docs/data-model.md).

Quick start (Node 24.19.0, Docker Compose):

```sh
npm ci
npm run env:init
# Securely configure your local .env credentials before seeding.
docker compose up -d --wait
npm run db:generate
npm run db:migrate
npm run db:seed
npm run health
npm run dev
```

Production sign-in is intentionally disabled until an OIDC integration is implemented. Use `STUDIO_PRISMA_ENGINE=classic PRISMA_CLIENT_ENGINE_TYPE=library AUTH_MODE=disabled npm run build` for the production build. See the development guide for tests, CI and the native Prisma defaults and explicit experimental local fallback. See [PR #1 review](docs/phase-1-review.md) for verified compatibility and migration-safety findings.

Phase 2 adds a complete ten-step character creator, private drafts, Character DNA/Visual Bible and immutable mock profiles. See [the character guide](docs/character-system.md) and [Phase 2 validation](docs/phase-2-validation.md). The default main branch gains these only after review/merge; the feature branch is phase-2-character-dna.


Phase 6 adds Video Studio, immutable storyboard revisions and private mock
text-to-video/image-to-video previews. Only fixed silent two-second sample
clips are produced; no paid providers or real facial animation are connected.
See [Video Studio](docs/video-generation.md), [verification](docs/phase-6-validation.md)
and [private development setup](docs/development.md). Phase 7 is not started.
