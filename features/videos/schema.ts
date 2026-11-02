import { z } from 'zod';
const text = z.string().trim().max(500);
export const performanceSchema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    mouthMovement: text.default('Natural closed-mouth breathing'),
    smileTransition: text.default('Neutral to soft smile'),
    eyeMouthCoordination: text.default('Eyes soften with the smile'),
    onset: z.number().min(0).max(30).default(0),
    peak: z.number().min(0).max(30).default(1),
    release: z.number().min(0).max(30).default(2),
  })
  .strict();
export const shotSchema = z
  .object({
    duration: z.number().min(0.5).max(30).default(2),
    framing: text.min(1).default('Medium portrait'),
    camera: text.min(1).default('Eye level · 50mm'),
    subject: text.min(1).default('Selected character'),
    action: text.min(1).default('Looks toward the camera'),
    expression: text.min(1).default('Soft smile'),
    environment: text.min(1).default('Selected scene environment'),
    cameraMovement: text.min(1).default('Locked-off'),
    transition: text.min(1).default('Cut'),
    audio: text.default(''),
    dialogue: text.default(''),
    performance: performanceSchema.default(() => performanceSchema.parse({})),
  })
  .strict()
  .superRefine((s, c) => {
    const p = s.performance;
    if (p.onset > p.peak || p.peak > p.release || p.release > s.duration)
      c.addIssue({
        code: 'custom',
        message: 'Facial timing must follow onset ≤ peak ≤ release ≤ shot duration.',
      });
  });
export const storyboardInput = z
  .object({
    title: text.min(2).default('Untitled storyboard'),
    characterVersionId: z.string().min(1),
    sceneVersionId: z.string().min(1),
    shots: z.array(shotSchema).min(1).max(8),
    status: z.enum(['draft', 'ready']).default('draft'),
    revision: z.number().int().positive().optional(),
  })
  .strict();
export const videoGenerationInput = z
  .object({
    storyboardRevisionId: z.string().min(1),
    operation: z.enum(['generate', 'image-to-video', 'variations', 'edit', 'extend']),
    sourceImageId: z.string().min(1).optional(),
    provider: z.literal('mock-video'),
    model: z.literal('studio-video-sample-v1'),
    seed: z.number().int().min(0).max(2147483600),
  })
  .strict();
export type ShotInput = z.infer<typeof shotSchema>;
export type StoryboardInput = z.infer<typeof storyboardInput>;
export const defaultShot = () => shotSchema.parse({});
export function mockShotWarnings(shots: ShotInput[]) {
  return shots.flatMap((s, i) => [
    ...(s.duration !== 2
      ? [`Shot ${i + 1}: this mock supports exactly 2 seconds. Save other durations as a draft.`]
      : []),
    ...(s.audio || s.dialogue
      ? [`Shot ${i + 1}: audio/dialogue are stored planning notes; the mock clip is silent.`]
      : []),
  ]);
}
