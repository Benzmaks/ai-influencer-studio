import 'dotenv/config';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { db } from '../lib/db';
import { developmentLoginAllowed } from '../lib/env';
async function seed() {
  if (!developmentLoginAllowed())
    throw new Error('Seed requires non-production NODE_ENV and AUTH_MODE=development.');
  const email = z.email().parse(process.env.DEV_AUTH_EMAIL).toLowerCase();
  const password = z.string().min(12).max(128).parse(process.env.DEV_AUTH_PASSWORD);
  await db.user.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Studio Creator', passwordHash: await hash(password, 12) },
  });
  console.log('Development account ensured. Existing users and projects were not modified.');
}
seed()
  .catch(() => {
    console.error(
      'Seed failed. Check database connectivity and DEV_AUTH_EMAIL/DEV_AUTH_PASSWORD (12+ characters).',
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
