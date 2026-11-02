import { mkdir, realpath, open, unlink } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { requireMembership } from '@/lib/access';
import type { StorageActor, StorageProvider } from './contracts';
import { AppError } from '@/lib/errors';
type Authorize = (actor: StorageActor, write: boolean) => Promise<unknown>;
export class LocalStorage implements StorageProvider {
  constructor(
    private root = process.env.LOCAL_STORAGE_DIR ?? '.local/assets',
    private authorize: Authorize = (a, write) =>
      requireMembership(a.userId, a.projectId, write ? 'write' : 'read'),
  ) {}
  private async directory(actor: StorageActor, write: boolean) {
    await this.authorize(actor, write);
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(actor.projectId))
      throw new AppError(400, 'Invalid project storage identifier.');
    const root = path.resolve(this.root);
    if (root === path.resolve('public') || root.startsWith(path.resolve('public') + path.sep))
      throw new Error('Private storage cannot be inside public/.');
    await mkdir(root, { recursive: true, mode: 0o700 });
    const resolvedRoot = await realpath(root);
    const folder = path.join(resolvedRoot, actor.projectId);
    await mkdir(folder, { recursive: true, mode: 0o700 });
    if ((await realpath(folder)) !== folder)
      throw new AppError(400, 'Storage symlinks are forbidden.');
    return folder;
  }
  private file(actor: StorageActor, key: string) {
    const [project, id, ...rest] = key.split('/');
    if (
      project !== actor.projectId ||
      rest.length ||
      !/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(id ?? '')
    )
      throw new AppError(404, 'Stored object not found.');
    return id;
  }
  async put(actor: StorageActor, data: Uint8Array, mimeType: string) {
    const dir = await this.directory(actor, true);
    if (data.byteLength === 0 || data.byteLength > 20 * 1024 * 1024)
      throw new AppError(400, 'Asset size must be between 1 byte and 20 MB.');
    const bytes = Buffer.from(data);
    const valid =
      (mimeType === 'image/png' &&
        bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
      (mimeType === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) ||
      (mimeType === 'video/mp4' && bytes.subarray(4, 8).toString() === 'ftyp');
    if (!valid)
      throw new AppError(400, 'Only signature-checked PNG, JPEG and MP4 files are accepted.');
    const id = randomUUID();
    const file = await open(
      path.join(dir, id),
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o600,
    );
    try {
      await file.writeFile(bytes);
    } finally {
      await file.close();
    }
    return {
      key: `${actor.projectId}/${id}`,
      mimeType,
      size: data.byteLength,
      checksum: createHash('sha256').update(bytes).digest('hex'),
    };
  }
  async read(actor: StorageActor, key: string) {
    const id = this.file(actor, key);
    const dir = await this.directory(actor, false);
    const file = await open(path.join(dir, id), constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      return await file.readFile();
    } finally {
      await file.close();
    }
  }
  async delete(actor: StorageActor, key: string) {
    const id = this.file(actor, key);
    const dir = await this.directory(actor, true);
    await unlink(path.join(dir, id));
  }
}
