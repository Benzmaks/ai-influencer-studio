import { readSnapshot } from '@/features/characters/dna';
import { sceneSchema } from '@/features/scenes/schema';
import { continuity } from '@/ai/continuity-engine';
import { positivePrompt } from './positive';
import { negativePrompt } from './negative';
export function compileScene(snapshot: unknown, input: unknown) {
  const s = sceneSchema.parse(input),
    dna = readSnapshot(snapshot),
    findings = continuity(snapshot, s);
  const ready = !!dna && !findings.some((f) => f.status === 'conflict');
  if (!dna || !ready)
    return {
      rulesVersion: 1,
      mock: true,
      label: 'Deterministic mock prompt preparation; no media generated',
      ready: false,
      findings,
      positive: '',
      negative: '',
    };
  return {
    rulesVersion: 1,
    mock: true,
    label: 'Deterministic mock prompt preparation; no media generated',
    ready: true,
    findings,
    positive: positivePrompt(dna, s),
    negative: negativePrompt(s),
  };
}
