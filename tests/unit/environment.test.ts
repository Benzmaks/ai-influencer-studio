import { describe, it, expect } from 'vitest';
import { developmentLoginAllowed, readEnvironment } from '@/lib/env';
const base = {
  DATABASE_URL: 'postgresql://localhost/studio',
  REDIS_URL: 'redis://localhost:6379',
  AUTH_SECRET: 'x'.repeat(32),
  AUTH_URL: 'http://localhost:3000',
  AUTH_MODE: 'development',
};
describe('environment and production authentication boundary', () => {
  it('accepts mock development without paid keys', () => {
    expect(readEnvironment(base).IMAGE_PROVIDER).toBe('mock');
    expect(developmentLoginAllowed(base)).toBe(true);
  });
  it('refuses production development login regardless of flag', () => {
    expect(developmentLoginAllowed({ ...base, NODE_ENV: 'production' })).toBe(false);
    expect(() => readEnvironment({ ...base, NODE_ENV: 'production' })).toThrow('forbidden');
  });
  it('fails closed without an explicit development mode', () => {
    expect(developmentLoginAllowed({})).toBe(false);
  });
  it('reports variable names without exposing connection secrets', () => {
    expect(() => readEnvironment({ ...base, DATABASE_URL: 'secret-value' })).toThrow(
      'DATABASE_URL',
    );
    try {
      readEnvironment({ ...base, DATABASE_URL: 'secret-value' });
    } catch (e) {
      expect(String(e)).not.toContain('secret-value');
    }
  });
  it('rejects unknown providers and insecure short signing secrets', () => {
    expect(() => readEnvironment({ ...base, IMAGE_PROVIDER: 'unknown' })).toThrow();
    expect(() => readEnvironment({ ...base, AUTH_SECRET: 'short' })).toThrow();
  });
  it('rejects non-HTTP origins, credentials and callback paths', () => {
    for (const AUTH_URL of [
      'ftp://example.test',
      'https://user:password@example.test',
      'https://example.test/api/auth',
      'https://example.test/?secret=value',
    ])
      expect(() => readEnvironment({ ...base, AUTH_URL })).toThrow('AUTH_URL');
  });
});
