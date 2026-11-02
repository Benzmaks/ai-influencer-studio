import { describe, it, expect } from 'vitest';
import {
  defaultAnswers,
  buildProfile,
  readSnapshot,
  realismLevels,
  completeAnswersSchema,
} from '@/features/characters/dna';
import { compileCharacter } from '@/ai/character-engine';
const fixture = {
  ...defaultAnswers(),
  name: 'Sofia Laurent',
  displayName: 'Sofia',
  nationality: 'French',
  signatureImperfections: ['Beauty mark below left eye'],
  voice: 'Reflective, warm observations',
};
describe('Character DNA compilation', () => {
  it('produces all seven documents with validated mock provenance deterministically', async () => {
    const a = await compileCharacter(fixture);
    expect(a).toEqual(await compileCharacter(fixture));
    expect(Object.keys(a.profile)).toHaveLength(7);
    expect(a.provenance.mock).toBe(true);
    expect(a.profile.characterDNA.identity).toMatchObject({
      name: fixture.name,
      nationality: 'French',
    });
    expect(a.profile.socialVoice.voice).toBe(fixture.voice);
    expect(readSnapshot(a)).toEqual(a);
  });
  it('preserves identity anchors at all five realism levels without inventing new imperfections', () => {
    for (let level = 1; level <= 5; level++) {
      const p = buildProfile({ ...fixture, realismLevel: level });
      expect(p.realismDNA.label).toBe(realismLevels[level - 1]);
      expect(p.visualBible.signatureImperfections).toEqual(fixture.signatureImperfections);
      expect(p.imageProfile.signatureImperfections).toEqual(fixture.signatureImperfections);
      expect(p.realismDNA.signatureImperfections).toEqual(fixture.signatureImperfections);
    }
    expect(
      buildProfile({ ...fixture, signatureImperfections: [] }).realismDNA.signatureImperfections,
    ).toEqual([]);
  });
  it('rejects incomplete publication, invalid age/level and oversized arrays', () => {
    expect(() => completeAnswersSchema.parse(defaultAnswers())).toThrow();
    expect(() => buildProfile({ ...fixture, age: 17 })).toThrow();
    expect(() => buildProfile({ ...fixture, realismLevel: 6 })).toThrow();
    expect(() => buildProfile({ ...fixture, traits: Array(21).fill('x') })).toThrow();
  });
  it('keeps legacy snapshots identifiable without fabricating saved DNA', () => {
    expect(readSnapshot({ schemaVersion: 1, identity: { name: 'Legacy' } })).toBeNull();
  });
  it('retains custom choices and distinguishes core, semi-permanent and scene attributes', () => {
    const p = buildProfile({
      ...fixture,
      faceShape: 'Custom heart-oval',
      interests: ['Botanical illustration'],
    });
    expect(p.characterDNA.appearance.faceShape).toBe('Custom heart-oval');
    expect(p.characterDNA.interests).toEqual(['Botanical illustration']);
    expect(p.characterDNA.attributeStability.core).toContain(
      'Signature features and imperfections',
    );
    expect(p.characterDNA.attributeStability.semiPermanent).toContain('Hairstyle');
    expect(p.characterDNA.attributeStability.sceneVariable).toContain('Pose and expression');
  });
});
