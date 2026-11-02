import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { PrismaPg } from '@prisma/adapter-pg';
// Explicit development fallback: verified npm-distributed WASM replaces native downloads.
// v7 pg adapter fixes catalog-type support and transaction cleanup; compatibility is integration-tested.
const native = process.env.STUDIO_PRISMA_ENGINE === 'classic';
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx database/seed.ts' },
  ...(native
    ? { engine: 'classic' as const, datasource: { url: process.env.DATABASE_URL ?? '' } }
    : {
        experimental: { adapter: true },
        engine: 'js' as const,
        adapter: async () => new PrismaPg({ connectionString: process.env.DATABASE_URL }),
      }),
});
