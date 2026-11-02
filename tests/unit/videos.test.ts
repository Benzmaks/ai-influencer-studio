import { describe, it, expect } from 'vitest';
import { compileStoryboard } from '@/ai/video-engine';
import {
  defaultShot,
  shotSchema,
  mockShotWarnings,
  videoGenerationInput,
} from '@/features/videos/schema';
import { defaultScene } from '@/features/scenes/schema';
import { defaultAnswers, snapshotSchema, buildProfile } from '@/features/characters/dna';
import { mockVideo } from '@/ai/mock';
import { requireCapability } from '@/ai/contracts';
import { videoResponse } from '@/features/videos/http-range';
const dna = () => {
  const answers = {
    ...defaultAnswers(),
    name: 'Video Sofia',
    displayName: 'Sofia',
    signatureImperfections: ['Right brow scar'],
  };
  return snapshotSchema.parse({
    schemaVersion: 2,
    answers,
    profile: buildProfile(answers),
    provenance: {
      provider: 'mock-language',
      mock: true,
      label: 'Mock test fixture',
      templateVersion: 1,
    },
  });
};
describe('storyboard schemas, consistency and provider capability boundaries', () => {
  it('stores every shot field and validates performance timing and bounded duration', () => {
    const shot = defaultShot();
    expect(shot).toMatchObject({
      duration: 2,
      framing: 'Medium portrait',
      subject: 'Selected character',
      cameraMovement: 'Locked-off',
      audio: '',
      dialogue: '',
      performance: { schemaVersion: 1, onset: 0, peak: 1, release: 2 },
    });
    expect(() =>
      shotSchema.parse({ ...shot, performance: { ...shot.performance, onset: 1.5, peak: 1 } }),
    ).toThrow('Facial timing');
    expect(() => shotSchema.parse({ ...shot, duration: 40 })).toThrow();
    expect(mockShotWarnings([{ ...shot, duration: 4, dialogue: 'Hello' }])).toHaveLength(2);
  });
  it('compiles deterministic per-shot prompts with exact DNA, realism and motion planning', () => {
    const input = [
      {
        ...defaultShot(),
        expression: 'Smile to laughter',
        performance: {
          ...defaultShot().performance,
          mouthMovement: 'Smile opens naturally',
          eyeMouthCoordination: 'Eyes crinkle with the smile',
        },
      },
    ];
    const first = compileStoryboard(dna(), defaultScene(), input);
    expect(first).toEqual(compileStoryboard(dna(), defaultScene(), input));
    expect(first.ready).toBe(true);
    expect(first.shots[0].positive).toContain('Right brow scar');
    expect(first.shots[0].positive).toContain('Eyes crinkle');
    expect(first.preservation?.signatureImperfections).toContain('Right brow scar');
    expect(first.negative).toContain('mouth warping');
  });
  it('rejects identity and continuity conflicts without changing canonical snapshots', () => {
    const original = dna(),
      before = structuredClone(original);
    const result = compileStoryboard(original, defaultScene(), [
      { ...defaultShot(), action: 'Remove the brow scar and change facial structure' },
    ]);
    expect(result.ready).toBe(false);
    expect(result.conflicts).toHaveLength(1);
    expect(original).toEqual(before);
    expect(
      compileStoryboard(
        original,
        {
          ...defaultScene(),
          overrides: [{ field: 'faceShape', value: 'Different', resolution: 'scene' }],
        },
        [defaultShot()],
      ).ready,
    ).toBe(false);
  });
  it('only advertises supported generation and fixed duration, never fake editing or variations', async () => {
    expect(mockVideo.capabilities.operations).toEqual(['generate', 'image-to-video']);
    expect(mockVideo.capabilities.audio).toBe(false);
    expect(mockVideo.capabilities.supportedDurations).toEqual([2]);
    for (const operation of ['edit', 'extend', 'variations'] as const)
      expect(() =>
        requireCapability(mockVideo.capabilities, operation, {
          prompt: 'A video',
          count: 1,
          seed: 42,
          source: new Uint8Array([1]),
          durationSeconds: 2,
        }),
      ).toThrow('not support');
    await expect(
      mockVideo.generate({ prompt: 'A video', count: 1, seed: 42, durationSeconds: 1 }),
    ).rejects.toThrow('duration');
    const first = await mockVideo.generate({
      prompt: 'A video',
      count: 1,
      seed: 42,
      durationSeconds: 2,
    });
    const second = await mockVideo.generate({
      prompt: 'A different prompt',
      count: 1,
      seed: 43,
      durationSeconds: 2,
      source: new Uint8Array([1]),
    });
    expect(first[0].bytes).toEqual(second[0].bytes);
    expect(first[0].label).toContain('fixed 2-second sample');
    expect(() =>
      videoGenerationInput.parse({
        storyboardRevisionId: 'v1',
        operation: 'generate',
        provider: 'paid',
        model: 'real',
        seed: 42,
      }),
    ).toThrow();
  });
});
describe('private MP4 byte range responses', () => {
  const bytes = Uint8Array.from({ length: 20 }, (_, i) => i);
  it('serves full, bounded, open-ended and suffix ranges with private headers', async () => {
    for (const [range, status, start, end] of [
      [null, 200, 0, 19],
      ['bytes=4-8', 206, 4, 8],
      ['bytes=17-', 206, 17, 19],
      ['bytes=-4', 206, 16, 19],
      ['bytes=17-99', 206, 17, 19],
    ] as const) {
      const response = videoResponse(
        new Request('http://localhost/video?download', { headers: range ? { range } : {} }),
        bytes,
        0,
      );
      expect(response.status).toBe(status);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes.slice(start, end + 1));
      expect(response.headers.get('content-disposition')).toContain('attachment');
    }
  });
  it('rejects invalid or multiple ranges and zero-length suffixes', () => {
    for (const range of [
      'bytes=99-100',
      'bytes=8-4',
      'bytes=',
      'bytes=-0',
      'bytes=0-1,4-5',
      'bytes=99999999999999999999-',
    ])
      expect(
        videoResponse(new Request('http://localhost/video', { headers: { range } }), bytes, 0)
          .status,
      ).toBe(416);
  });
});
