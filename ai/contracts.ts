import type { z } from 'zod';
export type Operation = 'generate' | 'edit' | 'variations' | 'image-to-video' | 'extend';
export interface ProviderCapabilities {
  id: string;
  mock: boolean;
  models: readonly string[];
  operations: readonly Operation[];
  batchSizes: readonly number[];
  maxDurationSeconds?: number;
  aspectRatios?: readonly string[];
  variationStrengths?: readonly string[];
}
export type ProviderContext = {
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
  simulateFailure?: boolean;
};
export type MediaInput = {
  prompt: string;
  negativePrompt?: string;
  model?: string;
  count: number;
  seed: number;
  source?: Uint8Array;
  instruction?: string;
  references?: Record<string, unknown>;
  durationSeconds?: number;
  aspectRatio?: string;
  variationStrength?: string;
};
export type MediaOutput = {
  bytes: Uint8Array;
  mimeType: string;
  label: string;
  mock: boolean;
  seed: number;
};
export interface LanguageModelProvider {
  capabilities: ProviderCapabilities;
  generate<T>(
    input: { task: string; context: Record<string, unknown>; schema: z.ZodType<T> },
    options?: ProviderContext,
  ): Promise<{ data: T; mock: true; label: string }>;
}
export interface ImageProvider {
  capabilities: ProviderCapabilities;
  generate(input: MediaInput, options?: ProviderContext): Promise<MediaOutput[]>;
  edit(input: MediaInput, options?: ProviderContext): Promise<MediaOutput[]>;
  createVariations(input: MediaInput, options?: ProviderContext): Promise<MediaOutput[]>;
}
export interface VideoProvider {
  capabilities: ProviderCapabilities;
  generate(input: MediaInput, options?: ProviderContext): Promise<MediaOutput[]>;
  edit?(input: MediaInput, options?: ProviderContext): Promise<MediaOutput[]>;
  extend?(input: MediaInput, options?: ProviderContext): Promise<MediaOutput[]>;
}
export function requireCapability(
  capabilities: ProviderCapabilities,
  operation: Operation,
  input: MediaInput,
) {
  if (!capabilities.operations.includes(operation))
    throw new Error('Provider does not support this operation.');
  if (!capabilities.batchSizes.includes(input.count)) throw new Error('Unsupported batch size.');
  if (input.model && !capabilities.models.includes(input.model))
    throw new Error('Unsupported model.');
  if (input.negativePrompt && input.negativePrompt.length > 10000)
    throw new Error('Negative prompt too long.');
  if (input.aspectRatio && !capabilities.aspectRatios?.includes(input.aspectRatio))
    throw new Error('Unsupported aspect ratio.');
  if (
    input.variationStrength &&
    !capabilities.variationStrengths?.includes(input.variationStrength)
  )
    throw new Error('Unsupported variation strength.');
  if (!input.prompt.trim() || input.prompt.length > 10000 || !Number.isSafeInteger(input.seed))
    throw new Error('Invalid media request.');
  if (
    input.durationSeconds !== undefined &&
    (!Number.isFinite(input.durationSeconds) ||
      input.durationSeconds <= 0 ||
      input.durationSeconds > (capabilities.maxDurationSeconds ?? 0))
  )
    throw new Error('Unsupported duration.');
  if (['edit', 'variations', 'image-to-video'].includes(operation) && !input.source?.length)
    throw new Error('A source asset is required.');
}
