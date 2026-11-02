import { describe, it, expect } from 'vitest';
import { developmentTokenAllowed } from '@/lib/auth-policy';
import { experimentalPrismaAllowed } from '@/lib/prisma-mode';
const dev = { AUTH_MODE: 'development', NODE_ENV: 'development' };
const token = { userId: 'creator', developmentSession: true };
describe('signed development session restrictions', () => {
  it('accepts only marked development tokens in explicit development mode', () => {
    expect(developmentTokenAllowed(token, dev)).toBe(true);
    expect(developmentTokenAllowed({ ...token, developmentSession: undefined }, dev)).toBe(false);
    expect(developmentTokenAllowed({ ...token, userId: '' }, dev)).toBe(false);
  });
  it('invalidates existing tokens when development auth is disabled', () => {
    expect(developmentTokenAllowed(token, { ...dev, AUTH_MODE: 'disabled' })).toBe(false);
  });
  it('rejects development tokens in production even when the signing secret is shared', () => {
    expect(developmentTokenAllowed(token, { ...dev, NODE_ENV: 'production' })).toBe(false);
  });
});
describe('Prisma release configuration', () => {
  it('defaults to the native engine', () => {
    expect(experimentalPrismaAllowed({})).toBe(false);
    expect(
      experimentalPrismaAllowed({
        STUDIO_PRISMA_ENGINE: 'classic',
        NODE_ENV: 'production',
        CI: 'true',
      }),
    ).toBe(false);
  });
  it('allows only explicit non-CI local experiments', () => {
    expect(
      experimentalPrismaAllowed({ STUDIO_PRISMA_ENGINE: 'experimental', NODE_ENV: 'development' }),
    ).toBe(true);
    for (const config of [{ NODE_ENV: 'production' }, { CI: 'true' }, { CI: '1' }])
      expect(() =>
        experimentalPrismaAllowed({ STUDIO_PRISMA_ENGINE: 'experimental', ...config }),
      ).toThrow('forbidden');
  });
  it('rejects typoed engine configuration instead of silently selecting a fallback', () => {
    expect(() => experimentalPrismaAllowed({ STUDIO_PRISMA_ENGINE: 'expiremental' })).toThrow();
  });
});
