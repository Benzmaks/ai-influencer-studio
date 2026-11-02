import type { CharacterSnapshot } from '@/features/characters/dna';
import type { SceneInput } from '@/features/scenes/schema';
import { realismInstructions } from '@/ai/realism-engine';
export function positivePrompt(dna: CharacterSnapshot, s: SceneInput) {
  const a = { ...dna.answers };
  for (const o of s.overrides)
    if (
      o.resolution === 'scene' &&
      ['hairStyle', 'hairColor', 'makeup', 'fashion'].includes(o.field)
    )
      Object.assign(a, { [o.field]: o.value });
  const sections = [
    [
      'Identity',
      [a.name, `${a.age} years old`, a.nationality, a.occupation, a.bio].filter(Boolean).join(', '),
    ],
    [
      'Facial appearance',
      `${a.faceShape}; ${a.facialProportions}; ${a.skinTone}; ${a.eyeColor} ${a.eyeShape} eyes; ${a.nose}; ${a.lips}; ${a.eyebrows}; ${a.jaw}`,
    ],
    ['Body appearance', `${a.bodyType}; ${a.height}; ${a.bodyProportions}; ${a.posture}`],
    ['Signature features', [...a.signatureFeatures, ...a.signatureImperfections].join('; ')],
    ['Skin realism', realismInstructions(dna, s.realism)],
    ['Hair', `${a.hairColor}; ${a.hairStyle}; ${a.hairTexture}`],
    [
      'Outfit',
      `${/canonical/i.test(s.outfit) ? a.fashion : s.outfit}; makeup: ${a.makeup}; accessories: ${/canonical/i.test(s.accessories) ? a.accessories.join(', ') : s.accessories}`,
    ],
    ['Scene', `${s.location}; ${s.activity}`],
    ['Pose', s.pose],
    ['Expression', `${s.expression}; ${s.mood}`],
    ['Environment', `${s.environment}; ${s.weather}; ${s.atmosphere}`],
    ['Camera', `${s.camera}; ${s.framing}`],
    ['Lens', `${s.lens}; ${s.depthOfField}`],
    ['Lighting', `${s.lighting}; ${s.time}`],
    ['Composition', s.composition],
    ['Photography style', `${s.photographyStyle}; ${s.candidness}`],
  ];
  return sections.map(([k, v]) => `${k}: ${v}`).join('\n\n');
}
