import { it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { mockRaster } from '@/ai/mock-raster';
import { generationInput } from '@/features/generation/schema';
import { mockImage } from '@/ai/mock';
it('renders deterministic, distinct labeled PNG test patterns in every supported aspect ratio', async () => {
  for (const [ratio, width, height] of [
    ['1:1', 480, 480],
    ['4:5', 384, 480],
    ['9:16', 270, 480],
    ['16:9', 480, 270],
  ] as const) {
    const a = mockRaster(42, ratio, 'Portrait', 'balanced');
    expect(a).toEqual(mockRaster(42, ratio, 'Portrait', 'balanced'));
    expect(a.readUInt32BE(16)).toBe(width);
    expect(a.readUInt32BE(20)).toBe(height);
    expect(a.toString()).toContain('MOCK procedural');
    let offset = 8;
    let data = Buffer.alloc(0);
    while (offset < a.length) {
      const n = a.readUInt32BE(offset),
        kind = a.toString('ascii', offset + 4, offset + 8);
      if (kind === 'IDAT') data = Buffer.concat([data, a.subarray(offset + 8, offset + 8 + n)]);
      offset += n + 12;
    }
    expect(inflateSync(data).length).toBe((width * 3 + 1) * height);
  }
  const results = await mockImage.generate({
    prompt: 'Studio test',
    count: 8,
    seed: 42,
    aspectRatio: '4:5',
  });
  expect(new Set(results.map((a) => createHash('sha256').update(a.bytes).digest('hex'))).size).toBe(
    8,
  );
});
it('rejects unsupported counts/providers, out-of-range seeds and extra paid parameters', () => {
  const a = {
    characterVersionId: 'c',
    sceneVersionId: 's',
    count: 4,
    aspectRatio: '4:5',
    provider: 'mock-image',
    model: 'studio-sample-v1',
    seed: 42,
  };
  expect(generationInput.safeParse(a).success).toBe(true);
  for (const wrong of [
    { count: 3 },
    { seed: -1 },
    { provider: 'paid' },
    { apiKey: 'secret' },
    { aspectRatio: '3:2' },
  ])
    expect(generationInput.safeParse({ ...a, ...wrong }).success).toBe(false);
});
it('variation strength/source change deterministic mock results without changing original bytes', () => {
  const original = mockRaster(42, '1:1', 'Portrait', 'balanced');
  const copy = Buffer.from(original);
  expect(mockRaster(42, '1:1', 'Portrait', 'subtle', original)).not.toEqual(
    mockRaster(42, '1:1', 'Portrait', 'bold', original),
  );
  expect(original).toEqual(copy);
});
