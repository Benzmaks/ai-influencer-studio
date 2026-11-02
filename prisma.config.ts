import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { experimentalPrismaAllowed } from './lib/prisma-mode';
const experimental = experimentalPrismaAllowed();
if (experimental)
  console.warn(
    'LOCAL EXPERIMENT ONLY: Prisma 6 schema WASM + pg adapter 7 is not a supported release configuration.',
  );
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx database/seed.ts' },
  ...(experimental
    ? {
        experimental: { adapter: true },
        engine: 'js' as const,
        adapter: async () => new PrismaPg({ connectionString: process.env.DATABASE_URL }),
      }
    : { engine: 'classic' as const, datasource: { url: process.env.DATABASE_URL ?? '' } }),
});
