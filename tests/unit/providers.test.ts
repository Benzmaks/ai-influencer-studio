import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { mockImage, mockLanguage, mockVideo, providerRegistry } from '@/ai/mock';
import { requireCapability } from '@/ai/contracts';
const input = { prompt: 'An editorial character portrait', count: 4, seed: 42 };
describe('mock provider contracts', () => {
  it('returns validated deterministic structured language fixtures', async () => {
    const schema = z.object({ name: z.string() });
    const request = { task: 'identity', context: { name: 'Sofia' }, schema };
    expect(await mockLanguage.generate(request)).toEqual(await mockLanguage.generate(request));
    await expect(mockLanguage.generate({ ...request, context: { name: 5 } })).rejects.toThrow();
  });
  it('returns requested 1, 2, 4 and 8 labeled samples deterministically', async () => {
    for (const count of [1, 2, 4, 8]) {
      const a = await mockImage.generate({ ...input, count });
      const b = await mockImage.generate({ ...input, count });
      expect(a).toEqual(b);
      expect(a).toHaveLength(count);
      expect(a[0].mimeType).toBe('image/png');
      expect(a[0].label).toContain('Mock output');
      expect(new Set(a.map((x) => Buffer.from(x.bytes).toString())).size).toBe(count);
    }
  });
  it('requires edit/variation inputs and rejects unsupported batches', async () => {
    await expect(mockImage.edit(input)).rejects.toThrow('source');
    await expect(
      mockImage.createVariations({ ...input, source: new Uint8Array([1]) }),
    ).resolves.toHaveLength(4);
    await expect(mockImage.generate({ ...input, count: 3 })).rejects.toThrow('batch');
  });
  it('reports progress, failure injection and cancellation without paid calls', async () => {
    const progress: number[] = [];
    await mockImage.generate(input, { onProgress: (p) => progress.push(p) });
    expect(progress).toEqual([0, 100]);
    await expect(mockImage.generate(input, { simulateFailure: true })).rejects.toThrow('Simulated');
    const controller = new AbortController();
    const task = mockImage.generate(input, { signal: controller.signal });
    controller.abort();
    await expect(task).rejects.toThrow();
  });
  it('provides a playable MP4 signature and rejects unsupported video editing', async () => {
    const result = await mockVideo.generate({ ...input, count: 1, durationSeconds: 2 });
    expect(Buffer.from(result[0].bytes).subarray(4, 8).toString()).toBe('ftyp');
    expect(result[0].label).toContain('Mock');
    expect(() => requireCapability(mockVideo.capabilities, 'edit', input)).toThrow('not support');
    await expect(mockVideo.generate({ ...input, durationSeconds: 9 })).rejects.toThrow('duration');
  });
  it('never silently selects an unimplemented provider', () => {
    expect(() => providerRegistry({ IMAGE_PROVIDER: 'paid' })).toThrow();
  });
});
