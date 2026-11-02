import { z } from 'zod';
export function readEnvironment(source: Record<string, string | undefined> = process.env) {
  const schema = z.object({
    DATABASE_URL: z.string().startsWith('postgresql://'),
    REDIS_URL: z.string().regex(/^rediss?:\/\//),
    AUTH_SECRET: z.string().min(32),
    AUTH_URL: z.url(),
    AUTH_MODE: z.enum(['development', 'disabled']).default('disabled'),
    LANGUAGE_PROVIDER: z.literal('mock').default('mock'),
    IMAGE_PROVIDER: z.literal('mock').default('mock'),
    VIDEO_PROVIDER: z.literal('mock').default('mock'),
    STORAGE_DRIVER: z.literal('local').default('local'),
    LOCAL_STORAGE_DIR: z.string().min(1).default('.local/assets'),
  });
  const result = schema.safeParse(source);
  if (!result.success)
    throw new Error(
      'Environment configuration needs attention: ' +
        result.error.issues.map((i) => i.path.join('.')).join(', ') +
        '. See .env.example and docs/development.md.',
    );
  if (source.NODE_ENV === 'production' && result.data.AUTH_MODE === 'development')
    throw new Error('Development authentication is forbidden in production.');
  return result.data;
}
export function developmentLoginAllowed(source: Record<string, string | undefined> = process.env) {
  return source.NODE_ENV !== 'production' && source.AUTH_MODE === 'development';
}
