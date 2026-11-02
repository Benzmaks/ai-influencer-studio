import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { experimentalPrismaAllowed } from './prisma-mode';
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
function client() {
  if (!globalDb.prisma) {
    const experimental = experimentalPrismaAllowed();
    globalDb.prisma = new PrismaClient(
      experimental
        ? {
            adapter: new PrismaPg({
              connectionString: process.env.DATABASE_URL,
              connectionTimeoutMillis: 3000,
            }),
          }
        : undefined,
    );
  }
  return globalDb.prisma;
}
// Lazy initialization keeps denied authentication requests independent of a database connection.
// A release must generate its own native client; never deploy a local experimental generated client.
export const db = new Proxy({} as PrismaClient, {
  get(_target, key) {
    const instance = client();
    const value = Reflect.get(instance, key);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
