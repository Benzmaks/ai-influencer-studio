import { z } from 'zod';
const text = z.string().trim().max(500);
export const sceneSchema = z
  .object({
    title: text.min(2).default('Untitled scene'),
    location: text.default('Paris café'),
    environment: text.default('Outdoor terrace'),
    activity: text.default('Holding a coffee'),
    outfit: text.default('Canonical wardrobe'),
    accessories: text.default('Canonical accessories'),
    pose: text.default('Relaxed seated posture'),
    expression: text.default('Soft smile'),
    mood: text.default('Thoughtful'),
    camera: text.default('Eye level'),
    framing: text.default('Medium portrait'),
    lens: text.default('50mm'),
    depthOfField: text.default('Soft background'),
    lighting: text.default('Natural window light'),
    time: text.default('Morning'),
    weather: text.default('Clear'),
    atmosphere: text.default('Quiet and intimate'),
    composition: text.default('Rule of thirds'),
    candidness: text.default('Relaxed candid'),
    realism: z.number().int().min(1).max(5).default(3),
    photographyStyle: text.default('Lifestyle photography'),
    generationType: z.enum(['image', 'video']).default('image'),
    overrides: z
      .array(
        z.object({
          field: z.enum([
            'hairStyle',
            'hairColor',
            'makeup',
            'fashion',
            'faceShape',
            'bodyProportions',
            'signatureImperfections',
          ]),
          value: text.min(1),
          resolution: z
            .enum(['canonical', 'scene', 'unresolved', 'permanent'])
            .default('unresolved'),
        }),
      )
      .max(7)
      .default([]),
  })
  .strict()
  .superRefine((s, c) => {
    if (new Set(s.overrides.map((o) => o.field)).size !== s.overrides.length)
      c.addIssue({ code: 'custom', message: 'Choose each appearance field once.' });
  });
export type SceneInput = z.infer<typeof sceneSchema>;
export const defaultScene = () => sceneSchema.parse({});
export const sceneFields: [keyof Omit<SceneInput, 'overrides' | 'realism'>, string, string[]][] = [
  ['location', 'Location', ['Paris café', 'Coastal boardwalk', 'Home studio']],
  ['environment', 'Environment', ['Outdoor terrace', 'Interior', 'Beach']],
  ['activity', 'Activity', ['Holding a coffee', 'Walking', 'Reading']],
  ['outfit', 'Outfit', ['Canonical wardrobe', 'Linen summer outfit', 'Evening dress']],
  ['accessories', 'Accessories', ['Canonical accessories', 'Gold jewelry', 'No accessories']],
  [
    'pose',
    'Pose & body language',
    ['Relaxed seated posture', 'Standing naturally', 'Walking mid-stride'],
  ],
  ['expression', 'Facial expression', ['Soft smile', 'Neutral', 'Laughing']],
  ['mood', 'Mood', ['Thoughtful', 'Joyful', 'Confident']],
  ['camera', 'Camera angle', ['Eye level', 'Low angle', 'Overhead']],
  ['framing', 'Framing', ['Medium portrait', 'Close-up', 'Full body']],
  ['lens', 'Lens', ['50mm', '85mm', '24mm']],
  ['depthOfField', 'Depth of field', ['Soft background', 'Deep focus', 'Shallow focus']],
  ['lighting', 'Lighting', ['Natural window light', 'Golden hour', 'Soft studio light']],
  ['time', 'Time of day', ['Morning', 'Afternoon', 'Night']],
  ['weather', 'Weather', ['Clear', 'Rain', 'Overcast']],
  ['atmosphere', 'Atmosphere', ['Quiet and intimate', 'Energetic city', 'Dreamy mist']],
  ['composition', 'Composition', ['Rule of thirds', 'Centered', 'Environmental portrait']],
  ['candidness', 'Candidness', ['Relaxed candid', 'Posed editorial', 'Unposed documentary']],
  [
    'photographyStyle',
    'Photography style',
    ['Lifestyle photography', 'Editorial photography', 'Documentary photography'],
  ],
];
export function sceneConcepts(input: SceneInput) {
  return [
    {
      ...input,
      title: `${input.title.slice(0, 450)} · café`,
      location: 'Paris café',
      environment: 'Outdoor terrace',
      activity: 'Holding a coffee',
      lighting: 'Natural window light',
    },
    {
      ...input,
      title: `${input.title.slice(0, 450)} · coast`,
      location: 'Coastal boardwalk',
      environment: 'Beach',
      activity: 'Walking',
      lighting: 'Golden hour',
      time: 'Afternoon',
    },
    {
      ...input,
      title: `${input.title.slice(0, 450)} · studio`,
      location: 'Home studio',
      environment: 'Interior',
      activity: 'Reading',
      lighting: 'Soft studio light',
      weather: 'Clear',
    },
  ].map((s) => sceneSchema.parse(s));
}

export const overrideLabels: Record<SceneInput['overrides'][number]['field'], string> = {
  hairStyle: 'Hairstyle',
  hairColor: 'Hair color',
  makeup: 'Makeup',
  fashion: 'Fashion',
  faceShape: 'Facial structure',
  bodyProportions: 'Body proportions',
  signatureImperfections: 'Signature imperfections',
};
