import { describe, it, expect } from 'vitest';
import { defaultAnswers, buildProfile } from '@/features/characters/dna';
import { defaultScene, sceneConcepts, sceneSchema } from '@/features/scenes/schema';
import { compileScene } from '@/ai/prompt-engine';
import { negativePrompt } from '@/ai/prompt-engine/negative';
const answers = {
  ...defaultAnswers(),
  name: 'Sofia',
  displayName: 'Sofia',
  signatureImperfections: ['Right brow scar'],
};
const snapshot = {
  schemaVersion: 2,
  answers,
  profile: buildProfile(answers),
  provenance: { provider: 'mock-language', mock: true, label: 'Mock', templateVersion: 1 },
};
describe('scene continuity and deterministic prompts', () => {
  it('produces repeatable prompts with identity, camera, realism and signature anchors', () => {
    const s = defaultScene();
    const a = compileScene(snapshot, s);
    expect(a.ready).toBe(true);
    expect(a).toEqual(compileScene(snapshot, s));
    expect(a.positive).toContain('Right brow scar');
    expect(a.positive).toContain('50mm');
    expect(a.positive).toContain('Sofia');
  });
  it('generates distinct deterministic concepts without mutating the source', () => {
    const s = defaultScene(),
      before = structuredClone(s);
    const concepts = sceneConcepts(s);
    expect(new Set(concepts.map((c) => c.location)).size).toBe(3);
    expect(concepts).toEqual(sceneConcepts(s));
    expect(s).toEqual(before);
  });
  it.each(['faceShape', 'bodyProportions', 'signatureImperfections'] as const)(
    'blocks scene-only protected %s changes',
    (field) => {
      const result = compileScene(snapshot, {
        ...defaultScene(),
        overrides: [{ field, value: 'Changed', resolution: 'scene' }],
      });
      expect(result.ready).toBe(false);
      expect(result.positive).toBe('');
      expect(result.findings).toContainEqual(
        expect.objectContaining({ field, status: 'conflict' }),
      );
    },
  );
  it('supports explicit temporary hair changes and canonical resolution without mutation', () => {
    const before = structuredClone(snapshot);
    const s = {
      ...defaultScene(),
      overrides: [{ field: 'hairColor', value: 'Violet', resolution: 'scene' }],
    };
    const changed = compileScene(snapshot, s);
    expect(changed.positive).toContain('Violet');
    expect(changed.findings[0].status).toBe('warning');
    expect(snapshot).toEqual(before);
    expect(
      compileScene(snapshot, {
        ...s,
        overrides: [{ field: 'hairColor', value: 'Violet', resolution: 'canonical' }],
      }).positive,
    ).not.toContain('Violet');
  });
  it('blocks unresolved changes and incomplete legacy character DNA', () => {
    expect(
      compileScene(snapshot, {
        ...defaultScene(),
        overrides: [{ field: 'makeup', value: 'Stage makeup', resolution: 'unresolved' }],
      }).ready,
    ).toBe(false);
    expect(compileScene({ schemaVersion: 1 }, defaultScene()).ready).toBe(false);
  });
  it('selects scene, camera and generation-specific negatives', () => {
    const a = negativePrompt({
      ...defaultScene(),
      activity: 'Resting',
      location: 'Studio',
      environment: 'Interior',
      framing: 'Close-up',
    });
    const b = negativePrompt({
      ...defaultScene(),
      location: 'Mirror room',
      lens: '24mm',
      generationType: 'video',
    });
    expect(a).not.toContain('extra fingers');
    expect(a).not.toContain('temporal flicker');
    expect(b).toContain('extra fingers');
    expect(b).toContain('incorrect reflections');
    expect(b).toContain('facial stretching');
    expect(b).toContain('temporal flicker');
  });
  it('reports physical, lighting, fashion and camera warnings', () => {
    const p = compileScene(snapshot, {
      ...defaultScene(),
      activity: 'Walking',
      time: 'Night',
      lens: '24mm',
      framing: 'Close-up',
      outfit: 'Summer linen',
      weather: 'Snow',
    });
    expect(p.findings.map((f) => f.field)).toEqual(
      expect.arrayContaining(['pose', 'lighting', 'camera', 'outfit', 'fashion']),
    );
  });
  it('requires explicit character publication for permanent updates', () => {
    const p = compileScene(snapshot, {
      ...defaultScene(),
      overrides: [{ field: 'hairColor', value: 'Red', resolution: 'permanent' }],
    });
    expect(p.ready).toBe(false);
    expect(p.findings[0].status).toBe('conflict');
  });
  it('rejects duplicate override fields and invalid realism', () => {
    expect(sceneSchema.safeParse({ ...defaultScene(), realism: 6 }).success).toBe(false);
    expect(
      sceneSchema.safeParse({
        ...defaultScene(),
        overrides: Array(2).fill({ field: 'hairColor', value: 'Red', resolution: 'scene' }),
      }).success,
    ).toBe(false);
  });
});

it('recognizes an unchanged protected value as compatible', () => {
  const p = compileScene(snapshot, {
    ...defaultScene(),
    overrides: [{ field: 'faceShape', value: answers.faceShape, resolution: 'unresolved' }],
  });
  expect(p.ready).toBe(true);
  expect(p.findings[0].status).toBe('compatible');
});
