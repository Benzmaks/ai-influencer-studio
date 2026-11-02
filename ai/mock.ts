import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  ImageProvider,
  LanguageModelProvider,
  VideoProvider,
  MediaInput,
  MediaOutput,
  ProviderContext,
  ProviderCapabilities,
  Operation,
} from './contracts';
import { mockRaster } from './mock-raster';
import { requireCapability } from './contracts';
async function simulate(options: ProviderContext = {}) {
  options.signal?.throwIfAborted();
  options.onProgress?.(0);
  await new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException('Cancelled', 'AbortError'));
    };
    const timer = setTimeout(() => {
      options.signal?.removeEventListener('abort', abort);
      resolve();
    }, 15);
    options.signal?.addEventListener('abort', abort, { once: true });
  });
  options.signal?.throwIfAborted();
  if (options.simulateFailure) throw new Error('Simulated mock provider failure; safe to retry.');
  options.onProgress?.(100);
}
export const mockLanguage: LanguageModelProvider = {
  capabilities: {
    id: 'mock-language',
    mock: true,
    models: ['fixture-v1'],
    operations: ['generate'],
    batchSizes: [1],
  },
  async generate(input, options) {
    await simulate(options);
    return {
      data: input.schema.parse(input.context),
      mock: true,
      label: `Mock language fixture · ${input.task}`,
    };
  },
};
const imageCapabilities: ProviderCapabilities = {
  aspectRatios: ['1:1', '4:5', '9:16', '16:9'],
  variationStrengths: ['subtle', 'balanced', 'bold'],
  id: 'mock-image',
  mock: true,
  models: ['studio-sample-v1'],
  operations: ['generate', 'edit', 'variations'],
  batchSizes: [1, 2, 4, 8],
};
async function image(
  operation: Operation,
  input: MediaInput,
  options?: ProviderContext,
): Promise<MediaOutput[]> {
  requireCapability(imageCapabilities, operation, input);
  await simulate(options);
  const delay = Number(process.env.MOCK_IMAGE_DELAY_MS ?? 0);
  if (input.aspectRatio && Number.isFinite(delay) && delay > 0)
    await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 10000)));
  options?.signal?.throwIfAborted();
  return Promise.all(
    Array.from({ length: input.count }, async (_, i) => {
      const sample = (((input.seed + i) % 8) + 8) % 8;
      const bytes = input.aspectRatio
        ? mockRaster(
            input.seed + i,
            input.aspectRatio,
            input.prompt + '\n' + (input.negativePrompt ?? '') + '\n' + (input.instruction ?? ''),
            input.variationStrength ?? 'balanced',
            input.source,
          )
        : await readFile(path.join(process.cwd(), `ai/fixtures/mock-image-${sample}.png`));
      return {
        bytes: Uint8Array.from(bytes),
        mimeType: 'image/png',
        label: input.aspectRatio
          ? operation === 'edit'
            ? 'Simulated mock edit · no real image processing'
            : 'Mock output · procedural test pattern, not AI photography'
          : 'Mock output · illustrative sample, not generated photography',
        mock: true as const,
        seed: input.seed + i,
      };
    }),
  );
}

export const mockImage: ImageProvider = {
  capabilities: imageCapabilities,
  generate: (i, o) => image('generate', i, o),
  edit: (i, o) => image('edit', i, o),
  createVariations: (i, o) => image('variations', i, o),
};
export const mockVideo: VideoProvider = {
  capabilities: {
    id: 'mock-video',
    mock: true,
    models: ['studio-video-sample-v1'],
    operations: ['generate', 'image-to-video'],
    batchSizes: [1, 2, 4, 8],
    maxDurationSeconds: 2,
    supportedDurations: [2],
    audio: false,
    storyboard: 'per-shot',
  },
  async generate(input, options) {
    requireCapability(this.capabilities, input.source ? 'image-to-video' : 'generate', input);
    await simulate(options);
    const delay = Number(process.env.MOCK_VIDEO_DELAY_MS ?? 0);
    if (Number.isFinite(delay) && delay > 0)
      await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 10000)));
    options?.signal?.throwIfAborted();
    const bytes = await readFile(path.join(process.cwd(), 'ai/fixtures/mock-video.mp4'));
    return Array.from({ length: input.count }, (_, i) => ({
      bytes: Uint8Array.from(bytes),
      mimeType: 'video/mp4',
      label: 'Mock output · fixed 2-second sample, not generated video',
      mock: true,
      seed: input.seed + i,
    }));
  },
};
export function providerRegistry(
  config: { LANGUAGE_PROVIDER?: string; IMAGE_PROVIDER?: string; VIDEO_PROVIDER?: string } = {
    LANGUAGE_PROVIDER: process.env.LANGUAGE_PROVIDER,
    IMAGE_PROVIDER: process.env.IMAGE_PROVIDER,
    VIDEO_PROVIDER: process.env.VIDEO_PROVIDER,
  },
) {
  for (const value of [config.LANGUAGE_PROVIDER, config.IMAGE_PROVIDER, config.VIDEO_PROVIDER])
    if (value && value !== 'mock') throw new Error('Only mock providers are enabled.');
  return { language: mockLanguage, image: mockImage, video: mockVideo };
}
