import { it, expect } from 'vitest';
import { defaultAnswers, buildProfile } from '@/features/characters/dna';
import { planEdit, editContext, editPrompt } from '@/ai/edit-engine';
import { rootOf } from '@/features/assets/lineage';
const answers = {
  ...defaultAnswers(),
  name: 'Sofia',
  displayName: 'Sofia',
  signatureFeatures: ['Small gold hoops'],
  signatureImperfections: ['Right brow scar'],
};
const snapshot = {
  schemaVersion: 2,
  answers,
  profile: buildProfile(answers),
  provenance: { provider: 'mock-language', mock: true, label: 'Mock', templateVersion: 1 },
};
it.each([
  'Change the outfit to a black evening dress.',
  'Change the background to a Paris café.',
  'Adjust lighting to golden hour.',
  'Change expression to a soft smile while preserving the character.',
  'Make the image more candid and photographic.',
])('accepts image-only mock instruction: %s', (instruction) => {
  expect(planEdit(snapshot, instruction).status).toBe('compatible');
});
it.each([
  'Remove freckles',
  'Change face shape',
  'Change body proportions',
  'Erase the right brow scar',
  'Replace small gold hoops',
  'Remove all accessories',
  'Change lip shape',
])('blocks protected request: %s', (instruction) => {
  expect(planEdit(snapshot, instruction).status).toBe('conflict');
});
it('retains full pinned preservation references without mutating the snapshot', () => {
  const original = structuredClone(snapshot);
  const context = editContext(snapshot);
  expect(context.signatureImperfections).toEqual(['Right brow scar']);
  expect(editPrompt('Source prompt', 'Change outfit', ['outfit'])).toContain('Source prompt');
  expect(editPrompt('Source prompt', 'Change outfit', ['outfit'])).toContain(
    'Preserve all unrelated',
  );
  expect(snapshot).toEqual(original);
  expect(planEdit(snapshot, 'Something unusual and custom').status).toBe('warning');
});
it('rejects incomplete DNA and cyclic or missing image lineage', () => {
  expect(planEdit({}, 'Change outfit').status).toBe('conflict');
  const nodes = [
    { id: 'a', sourceAssetId: null, status: 'completed' },
    { id: 'b', sourceAssetId: 'a', status: 'completed' },
  ];
  expect(rootOf(nodes, 'b')).toBe('a');
  expect(() =>
    rootOf(
      [
        { id: 'a', sourceAssetId: 'b', status: 'completed' },
        { id: 'b', sourceAssetId: 'a', status: 'completed' },
      ],
      'a',
    ),
  ).toThrow('cyclic');
  expect(() => rootOf([{ id: 'a', sourceAssetId: 'elsewhere', status: 'completed' }], 'a')).toThrow(
    'missing',
  );
});
