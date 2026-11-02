import { mkdtemp, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { LocalStorage } from '@/storage/local';
import { AppError } from '@/lib/errors';
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
  'base64',
);
let folder: string;
const actor = { userId: 'creator', projectId: 'project-one' };
beforeEach(async () => {
  folder = await mkdtemp(path.join(os.tmpdir(), 'studio-store-'));
});
afterEach(async () => {
  await rm(folder, { recursive: true, force: true });
});
const allowed = async () => {};
describe('private local storage', () => {
  it('round-trips signature-checked content without overwriting originals', async () => {
    const store = new LocalStorage(folder, allowed);
    const first = await store.put(actor, png, 'image/png');
    const second = await store.put(actor, png, 'image/png');
    expect(first.key).not.toBe(second.key);
    expect(first.checksum).toBe(second.checksum);
    expect(Buffer.from(await store.read(actor, first.key))).toEqual(png);
    await store.delete(actor, second.key);
    await expect(store.read(actor, second.key)).rejects.toThrow();
    expect(Buffer.from(await store.read(actor, first.key))).toEqual(png);
  });
  it('rejects cross-project keys and path traversal', async () => {
    const store = new LocalStorage(folder, allowed);
    const object = await store.put(actor, png, 'image/png');
    await expect(store.read({ ...actor, projectId: 'other' }, object.key)).rejects.toThrow();
    await expect(store.read(actor, 'project-one/../../secret')).rejects.toThrow();
  });
  it('rejects active SVG, MIME spoofing and oversized data', async () => {
    const store = new LocalStorage(folder, allowed);
    await expect(store.put(actor, Buffer.from('<script/>'), 'image/png')).rejects.toThrow(
      'signature',
    );
    await expect(store.put(actor, Buffer.from('<svg/>'), 'image/svg+xml')).rejects.toThrow();
    await expect(store.put(actor, new Uint8Array(21 * 1024 * 1024), 'image/png')).rejects.toThrow(
      '20 MB',
    );
  });
  it('checks access before reading, writing or deleting', async () => {
    const denied = new LocalStorage(folder, async () => {
      throw new AppError(403, 'denied');
    });
    await expect(denied.put(actor, png, 'image/png')).rejects.toThrow('denied');
    await expect(
      denied.read(actor, 'project-one/00000000-0000-0000-0000-000000000000'),
    ).rejects.toThrow('denied');
    await expect(
      denied.delete(actor, 'project-one/00000000-0000-0000-0000-000000000000'),
    ).rejects.toThrow('denied');
  });
  it('refuses project-directory symlinks', async () => {
    await symlink(os.tmpdir(), path.join(folder, actor.projectId));
    await expect(new LocalStorage(folder, allowed).put(actor, png, 'image/png')).rejects.toThrow(
      'symlinks',
    );
  });
});
