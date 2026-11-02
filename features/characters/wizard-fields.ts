import type { CharacterAnswers } from './dna';
export type Field = {
  key: keyof CharacterAnswers;
  label: string;
  options?: string[];
  multiple?: boolean;
  long?: boolean;
  number?: boolean;
};
export const wizardSteps: { title: string; subtitle: string; fields: Field[] }[] = [
  {
    title: 'Identity',
    subtitle: 'Every story begins with someone.',
    fields: [
      { key: 'name', label: 'Character name' },
      { key: 'displayName', label: 'Display name' },
      { key: 'age', label: 'Age', number: true },
      { key: 'nationality', label: 'Nationality' },
      { key: 'location', label: 'Location' },
      { key: 'occupation', label: 'Occupation' },
      { key: 'birthday', label: 'Birthday (optional)' },
      {
        key: 'languages',
        label: 'Languages',
        multiple: true,
        options: ['English', 'French', 'Spanish', 'Arabic', 'Japanese'],
      },
      { key: 'bio', label: 'Background', long: true },
    ],
  },
  {
    title: 'Point of view',
    subtitle: 'Find their place in the world.',
    fields: [
      {
        key: 'category',
        label: 'Influencer category',
        options: [
          'Lifestyle',
          'Fashion',
          'Travel',
          'Wellness',
          'Food',
          'Art & culture',
          'Technology',
        ],
      },
      {
        key: 'niche',
        label: 'Content niche',
        options: [
          'Everyday creativity',
          'Sustainable style',
          'City discoveries',
          'Slow living',
          'Fitness journeys',
        ],
      },
      { key: 'audience', label: 'Target audience', long: true },
    ],
  },
  {
    title: 'Personality',
    subtitle: 'The little things that make them, them.',
    fields: [
      {
        key: 'archetype',
        label: 'Personality archetype',
        options: ['The explorer', 'The creator', 'The optimist', 'The mentor', 'The rebel'],
      },
      {
        key: 'traits',
        label: 'Character traits',
        multiple: true,
        options: ['Curious', 'Warm', 'Ambitious', 'Reflective', 'Playful', 'Independent'],
      },
      {
        key: 'interests',
        label: 'Interests',
        multiple: true,
        options: ['Travel', 'Photography', 'Music', 'Design', 'Cooking', 'Reading'],
      },
      {
        key: 'lifestyle',
        label: 'Lifestyle',
        options: [
          'Creative city living',
          'Slow countryside days',
          'Active outdoor life',
          'Frequent traveler',
        ],
      },
      {
        key: 'socialEnergy',
        label: 'Social energy',
        options: ['Reserved', 'Balanced', 'Outgoing'],
      },
      { key: 'strengths', label: 'Strengths' },
      { key: 'weaknesses', label: 'Weaknesses' },
      { key: 'ambitions', label: 'Ambitions' },
      { key: 'fears', label: 'Fears' },
      { key: 'habits', label: 'Habits' },
      { key: 'emotionalStyle', label: 'Emotional style' },
    ],
  },
  {
    title: 'Appearance',
    subtitle: 'Define an identity that stays recognizable.',
    fields: [
      {
        key: 'faceShape',
        label: 'Face shape',
        options: ['Oval', 'Round', 'Heart', 'Square', 'Oblong'],
      },
      { key: 'facialProportions', label: 'Facial proportions' },
      {
        key: 'skinTone',
        label: 'Skin tone',
        options: ['Fair cool', 'Light neutral', 'Medium warm', 'Olive', 'Deep warm', 'Deep cool'],
      },
      { key: 'eyeColor', label: 'Eye color', options: ['Brown', 'Hazel', 'Green', 'Blue', 'Grey'] },
      { key: 'eyeShape', label: 'Eye shape', options: ['Almond', 'Round', 'Hooded', 'Upturned'] },
      {
        key: 'nose',
        label: 'Nose',
        options: ['Soft straight bridge', 'Rounded tip', 'Defined bridge', 'Subtle aquiline'],
      },
      {
        key: 'lips',
        label: 'Lips',
        options: ['Medium natural shape', 'Full with soft cupid’s bow', 'Fine natural shape'],
      },
      {
        key: 'eyebrows',
        label: 'Eyebrows',
        options: ['Natural softly arched', 'Straight and full', 'Fine gentle arch'],
      },
      { key: 'jaw', label: 'Jaw', options: ['Softly defined', 'Rounded', 'Angular'] },
      {
        key: 'hairStyle',
        label: 'Hairstyle',
        options: ['Shoulder length', 'Long layers', 'Short crop', 'Bob', 'Braids'],
      },
      {
        key: 'hairColor',
        label: 'Hair color',
        options: ['Dark brown', 'Black', 'Chestnut', 'Blonde', 'Red', 'Silver'],
      },
      {
        key: 'hairTexture',
        label: 'Hair texture',
        options: ['Straight', 'Wavy', 'Curly', 'Coily'],
      },
      {
        key: 'bodyType',
        label: 'Body type',
        options: ['Average build', 'Lean', 'Athletic', 'Curvy', 'Broad build'],
      },
      { key: 'height', label: 'Height' },
      { key: 'bodyProportions', label: 'Body proportions' },
      { key: 'posture', label: 'Natural posture' },
    ],
  },
  {
    title: 'Signature style',
    subtitle: 'A recognizable visual point of view.',
    fields: [
      {
        key: 'fashion',
        label: 'Fashion identity',
        options: [
          'Relaxed contemporary',
          'Minimal tailoring',
          'Vintage eclectic',
          'Sporty casual',
          'Editorial statement',
        ],
      },
      {
        key: 'makeup',
        label: 'Makeup',
        options: ['Minimal natural', 'No makeup', 'Soft polished', 'Expressive editorial'],
      },
      {
        key: 'accessories',
        label: 'Accessories',
        multiple: true,
        options: ['Small gold hoops', 'Silver rings', 'Classic watch', 'Glasses', 'Silk scarf'],
      },
      {
        key: 'signatureFeatures',
        label: 'Signature appearance',
        multiple: true,
        options: ['Distinctive smile', 'Defined cheekbones', 'Expressive eyebrows', 'Curly fringe'],
      },
    ],
  },
  { title: 'Realism', subtitle: 'Choose the photographic finish. Keep the identity.', fields: [] },
  {
    title: 'Human details',
    subtitle: 'Subtle, intentional and consistent. None is always a valid choice.',
    fields: [
      {
        key: 'skinTexture',
        label: 'Skin texture',
        options: ['Polished', 'Natural', 'Candid texture'],
      },
      { key: 'pores', label: 'Pores', options: ['Minimal', 'Subtle', 'Visible natural'] },
      {
        key: 'freckles',
        label: 'Freckles',
        options: ['None', 'A few subtle freckles', 'Light scattered freckles'],
      },
      {
        key: 'beautyMarks',
        label: 'Beauty marks',
        options: ['None', 'One subtle beauty mark', 'A few small marks'],
      },
      {
        key: 'asymmetry',
        label: 'Facial / eyebrow asymmetry',
        options: ['Minimal', 'Subtle natural', 'Noticeable natural'],
      },
      { key: 'pigmentation', label: 'Pigmentation' },
      { key: 'scars', label: 'Minor scars' },
      { key: 'underEyeTexture', label: 'Under-eye texture' },
      { key: 'lipTexture', label: 'Lip texture' },
      { key: 'peachFuzz', label: 'Peach fuzz' },
      { key: 'bodyAsymmetry', label: 'Body asymmetry' },
      {
        key: 'signatureImperfections',
        label: 'Persistent signature imperfections',
        multiple: true,
        options: [
          'Beauty mark below left eye',
          'Freckles across nose',
          'Slightly higher left eyebrow',
          'Small scar on right brow',
        ],
      },
    ],
  },
  {
    title: 'Brand world',
    subtitle: 'A clear aesthetic, with something to say.',
    fields: [
      { key: 'brandName', label: 'Brand name (optional)' },
      {
        key: 'brandValues',
        label: 'Brand values',
        multiple: true,
        options: ['Authenticity', 'Curiosity', 'Creativity', 'Sustainability', 'Confidence'],
      },
      {
        key: 'visualAesthetic',
        label: 'Visual aesthetic',
        options: [
          'Warm editorial',
          'Clean minimal',
          'Film nostalgia',
          'Vibrant urban',
          'Soft romantic',
        ],
      },
      { key: 'colorPalette', label: 'Color palette' },
      { key: 'photographyStyle', label: 'Photography style' },
      { key: 'lenses', label: 'Preferred lenses' },
      { key: 'lighting', label: 'Preferred lighting' },
      { key: 'compositions', label: 'Preferred compositions' },
      {
        key: 'contentPillars',
        label: 'Content pillars',
        multiple: true,
        options: [
          'Everyday inspiration',
          'Creative discoveries',
          'Personal stories',
          'Style notes',
          'Travel diaries',
        ],
      },
    ],
  },
  {
    title: 'Social voice',
    subtitle: 'Make every conversation sound like them.',
    fields: [
      {
        key: 'socialPersonality',
        label: 'Social-media personality',
        options: [
          'Approachable and curious',
          'Confident and expressive',
          'Quiet and thoughtful',
          'Playful and spontaneous',
        ],
      },
      {
        key: 'communicationStyle',
        label: 'Communication style',
        options: [
          'Thoughtful storyteller',
          'Direct and concise',
          'Conversational friend',
          'Reflective journal',
        ],
      },
      { key: 'voice', label: 'Social voice' },
      {
        key: 'tone',
        label: 'Tone',
        options: ['Conversational', 'Reflective', 'Upbeat', 'Understated'],
      },
      {
        key: 'humor',
        label: 'Humor',
        options: ['Gentle wit', 'Dry humor', 'Playful', 'Mostly sincere'],
      },
    ],
  },
  { title: 'Review', subtitle: 'A character with a point of view. Make it yours.', fields: [] },
];
