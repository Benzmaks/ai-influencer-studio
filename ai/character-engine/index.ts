import { providerRegistry } from '../mock';
import {
  completeAnswersSchema,
  buildProfile,
  profileSchema,
  snapshotSchema,
} from '@/features/characters/dna';
export async function compileCharacter(input: unknown) {
  const answers = completeAnswersSchema.parse(input);
  const result = await providerRegistry().language.generate({
    task: 'Character DNA profile',
    context: buildProfile(answers),
    schema: profileSchema,
  });
  return snapshotSchema.parse({
    schemaVersion: 2,
    answers,
    profile: result.data,
    provenance: {
      provider: 'mock-language',
      mock: true,
      label: 'Mock profile · deterministic template, not real AI generation',
      templateVersion: 1,
    },
  });
}
