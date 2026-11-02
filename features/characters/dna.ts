import { z } from 'zod';
const text = z.string().trim().max(500);
const list = z.array(z.string().trim().min(1).max(120)).max(20);
export const realismLevels = [
  'Editorial',
  'Polished social media',
  'Natural influencer',
  'Candid',
  'Documentary realism',
] as const;
export const answersSchema = z.object({
  name: text.default(''),
  displayName: text.default(''),
  age: z.number().int().min(18).max(120).default(25),
  nationality: text.default(''),
  location: text.default(''),
  occupation: text.default(''),
  birthday: text.default(''),
  languages: list.default(['English']),
  bio: z.string().trim().max(2000).default(''),
  category: text.default('Lifestyle'),
  niche: text.default('Everyday creativity'),
  audience: text.default('Adults interested in thoughtful everyday living'),
  archetype: text.default('The explorer'),
  traits: list.default(['Curious', 'Warm']),
  interests: list.default(['Travel', 'Photography']),
  lifestyle: text.default('Creative city living'),
  socialEnergy: text.default('Balanced'),
  strengths: text.default('Observant and adaptable'),
  weaknesses: text.default('Sometimes overthinks'),
  ambitions: text.default('Inspire everyday creativity'),
  fears: text.default('Losing authenticity'),
  habits: text.default('Morning walks'),
  emotionalStyle: text.default('Open and grounded'),
  faceShape: text.default('Oval'),
  facialProportions: text.default('Balanced natural proportions'),
  skinTone: text.default('Medium warm'),
  eyeColor: text.default('Brown'),
  eyeShape: text.default('Almond'),
  eyebrows: text.default('Natural softly arched'),
  nose: text.default('Soft straight bridge'),
  lips: text.default('Medium natural shape'),
  jaw: text.default('Softly defined'),
  hairStyle: text.default('Shoulder length'),
  hairColor: text.default('Dark brown'),
  hairTexture: text.default('Wavy'),
  bodyType: text.default('Average build'),
  height: text.default('170 cm'),
  bodyProportions: text.default('Natural balanced proportions'),
  posture: text.default('Relaxed and natural'),
  fashion: text.default('Relaxed contemporary'),
  makeup: text.default('Minimal natural'),
  accessories: list.default([]),
  signatureFeatures: list.default([]),
  realismLevel: z.number().int().min(1).max(5).default(3),
  pores: text.default('Subtle'),
  freckles: text.default('None'),
  beautyMarks: text.default('None'),
  asymmetry: text.default('Subtle natural'),
  skinTexture: text.default('Natural'),
  pigmentation: text.default('Even with subtle natural variation'),
  scars: text.default('None'),
  underEyeTexture: text.default('Subtle natural'),
  lipTexture: text.default('Natural'),
  peachFuzz: text.default('Subtle'),
  bodyAsymmetry: text.default('Subtle natural'),
  signatureImperfections: list.default([]),
  brandName: text.default(''),
  brandValues: list.default(['Authenticity', 'Curiosity']),
  visualAesthetic: text.default('Warm editorial'),
  colorPalette: text.default('Sage, cream and warm neutrals'),
  photographyStyle: text.default('Natural lifestyle photography'),
  lenses: text.default('35 mm and 50 mm'),
  lighting: text.default('Soft natural light'),
  compositions: text.default('Considered candid framing'),
  contentPillars: list.default(['Everyday inspiration', 'Creative discoveries']),
  voice: text.default('Warm and observant'),
  tone: text.default('Conversational'),
  communicationStyle: text.default('Thoughtful storyteller'),
  humor: text.default('Gentle wit'),
  socialPersonality: text.default('Approachable and curious'),
});
export type CharacterAnswers = z.infer<typeof answersSchema>;
export const completeAnswersSchema = answersSchema.extend({
  name: z.string().trim().min(2, 'Character name needs at least 2 characters.').max(80),
  displayName: z.string().trim().min(2, 'Display name needs at least 2 characters.').max(80),
});
export function defaultAnswers(): CharacterAnswers {
  return answersSchema.parse({});
}
export const stability = {
  core: [
    'Name and identity',
    'Facial structure and proportions',
    'Eye color and skin tone',
    'Core body proportions',
    'Core personality',
    'Signature features and imperfections',
  ],
  semiPermanent: ['Hairstyle', 'Makeup', 'Fashion identity', 'Accessories'],
  sceneVariable: [
    'Outfit',
    'Location',
    'Pose and expression',
    'Activity',
    'Weather and lighting',
    'Camera and mood',
  ],
} as const;
export function buildProfile(input: CharacterAnswers) {
  const a = completeAnswersSchema.parse(input);
  return {
    characterDNA: {
      identity: {
        name: a.name,
        displayName: a.displayName,
        age: a.age,
        nationality: a.nationality,
        location: a.location,
        occupation: a.occupation,
        birthday: a.birthday,
        languages: a.languages,
        background: a.bio,
      },
      positioning: { category: a.category, niche: a.niche, targetAudience: a.audience },
      personality: {
        archetype: a.archetype,
        traits: a.traits,
        socialEnergy: a.socialEnergy,
        strengths: a.strengths,
        weaknesses: a.weaknesses,
        ambitions: a.ambitions,
        fears: a.fears,
        habits: a.habits,
        emotionalStyle: a.emotionalStyle,
      },
      appearance: {
        faceShape: a.faceShape,
        facialProportions: a.facialProportions,
        skinTone: a.skinTone,
        eyes: `${a.eyeColor}, ${a.eyeShape}`,
        eyebrows: a.eyebrows,
        nose: a.nose,
        lips: a.lips,
        jaw: a.jaw,
        hair: `${a.hairStyle}, ${a.hairColor}, ${a.hairTexture}`,
        bodyType: a.bodyType,
        height: a.height,
        bodyProportions: a.bodyProportions,
        posture: a.posture,
      },
      interests: a.interests,
      lifestyle: a.lifestyle,
      attributeStability: stability,
    },
    visualBible: {
      canonicalFace: `${a.faceShape} face; ${a.facialProportions}; ${a.eyeColor} ${a.eyeShape} eyes; ${a.nose}; ${a.lips}; ${a.eyebrows} eyebrows; ${a.jaw} jaw.`,
      canonicalHair: `${a.hairStyle}, ${a.hairColor}, ${a.hairTexture}`,
      canonicalBody: `${a.bodyType}; ${a.height}; ${a.bodyProportions}; ${a.posture}`,
      canonicalSkin: `${a.skinTone}; ${a.skinTexture} texture; ${a.pores} pores`,
      signatureFeatures: a.signatureFeatures,
      signatureImperfections: a.signatureImperfections,
      makeup: a.makeup,
      fashionIdentity: a.fashion,
      jewelryAndAccessories: a.accessories,
      colorPalette: a.colorPalette,
      photographyStyle: a.photographyStyle,
      preferredLenses: a.lenses,
      preferredLighting: a.lighting,
      preferredCompositions: a.compositions,
      realismLevel: realismLevels[a.realismLevel - 1],
    },
    brandDNA: {
      name: a.brandName || a.displayName,
      category: a.category,
      niche: a.niche,
      targetAudience: a.audience,
      values: a.brandValues,
      visualAesthetic: a.visualAesthetic,
      colorPalette: a.colorPalette,
    },
    realismDNA: {
      level: a.realismLevel,
      label: realismLevels[a.realismLevel - 1],
      pores: a.pores,
      freckles:
        a.freckles === 'None' && a.signatureImperfections.length
          ? 'None beyond explicit signature anchors'
          : a.freckles,
      beautyMarks:
        a.beautyMarks === 'None' && a.signatureImperfections.length
          ? 'None beyond explicit signature anchors'
          : a.beautyMarks,
      facialAsymmetry: a.asymmetry,
      skinTexture: a.skinTexture,
      pigmentation: a.pigmentation,
      minorScars:
        a.scars === 'None' && a.signatureImperfections.length
          ? 'None beyond explicit signature anchors'
          : a.scars,
      underEyeTexture: a.underEyeTexture,
      lipTexture: a.lipTexture,
      peachFuzz: a.peachFuzz,
      bodyAsymmetry: a.bodyAsymmetry,
      signatureImperfections: a.signatureImperfections,
      policy:
        'Preserve explicit identity anchors. Do not invent additional imperfections or exaggerate them when realism changes.',
    },
    socialVoice: {
      voice: a.voice,
      tone: a.tone,
      communicationStyle: a.communicationStyle,
      humor: a.humor,
      socialPersonality: a.socialPersonality,
    },
    contentPillars: a.contentPillars,
    imageProfile: {
      identityReference: 'Use this exact immutable character version',
      photographyStyle: a.photographyStyle,
      lenses: a.lenses,
      lighting: a.lighting,
      composition: a.compositions,
      realismLevel: realismLevels[a.realismLevel - 1],
      signatureFeatures: a.signatureFeatures,
      signatureImperfections: a.signatureImperfections,
      generationStatus: 'Planned; this is a mock configuration, not a generated image',
    },
  };
}
const document = z.record(z.string(), z.json());
export const profileSchema = z.object({
  characterDNA: document,
  visualBible: document,
  brandDNA: document,
  realismDNA: document,
  socialVoice: document,
  contentPillars: list,
  imageProfile: document,
});
export const snapshotSchema = z.object({
  schemaVersion: z.literal(2),
  answers: completeAnswersSchema,
  profile: profileSchema,
  provenance: z.object({
    provider: z.literal('mock-language'),
    mock: z.literal(true),
    label: z.string(),
    templateVersion: z.literal(1),
  }),
});
export type CharacterSnapshot = z.infer<typeof snapshotSchema>;
export function readSnapshot(value: unknown) {
  const result = snapshotSchema.safeParse(value);
  return result.success ? result.data : null;
}
