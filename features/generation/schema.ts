import { z } from 'zod';
export const generationInput = z
  .object({
    characterVersionId: z.string().min(1),
    sceneVersionId: z.string().min(1),
    count: z.union([z.literal(1), z.literal(2), z.literal(4), z.literal(8)]),
    aspectRatio: z.enum(['1:1', '4:5', '9:16', '16:9']),
    provider: z.literal('mock-image'),
    model: z.literal('studio-sample-v1'),
    seed: z.number().int().min(0).max(2147483600),
    sourceAssetId: z.string().min(1).optional(),
    variationStrength: z.enum(['subtle', 'balanced', 'bold']).default('balanced'),
  })
  .strict();
export type GenerationInput = z.infer<typeof generationInput>;
export const activeStatuses = ['queued', 'processing'];
export const imageCapabilities = {
  id: 'mock-image',
  mock: true,
  models: ['studio-sample-v1'],
  operations: ['generate', 'variations'],
  batchSizes: [1, 2, 4, 8],
  aspectRatios: ['1:1', '4:5', '9:16', '16:9'],
  variationStrengths: ['subtle', 'balanced', 'bold'],
  costPerImage: 0,
} as const;
export const policy = {
  maxBatch: 8,
  maxAutomaticAttempts: 3,
  maxManualRetries: 3,
  maxActivePerProject: 10,
  maxStoredResultsPerProject: 2000,
  paidProvidersEnabled: false,
} as const;
