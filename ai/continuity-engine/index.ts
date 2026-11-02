import { readSnapshot } from '@/features/characters/dna';
import type { SceneInput } from '@/features/scenes/schema';
export type Finding = {
  field: string;
  status: 'compatible' | 'warning' | 'conflict';
  message: string;
};
export function continuity(snapshot: unknown, scene: SceneInput): Finding[] {
  const dna = readSnapshot(snapshot);
  const findings: Finding[] = [];
  if (!dna)
    findings.push({
      field: 'character',
      status: 'conflict',
      message:
        'Complete Character DNA before preparing this scene. Basic profiles lack verified visual anchors.',
    });
  for (const o of scene.overrides) {
    const value = dna?.answers[o.field];
    const matches =
      !!dna &&
      (Array.isArray(value) ? value.join('; ') : String(value)).trim().toLowerCase() ===
        o.value.trim().toLowerCase();
    const locked = ['faceShape', 'bodyProportions', 'signatureImperfections'].includes(o.field);
    findings.push({
      field: o.field,
      status:
        o.resolution === 'canonical' || matches
          ? 'compatible'
          : locked
            ? 'conflict'
            : o.resolution === 'unresolved' || o.resolution === 'permanent'
              ? 'conflict'
              : 'warning',
      message:
        o.resolution === 'canonical' || matches
          ? 'Canonical appearance retained.'
          : locked
            ? 'Protected identity anchor. Keep canonical appearance or explicitly create a permanent character version in Character DNA.'
            : o.resolution === 'scene'
              ? 'Scene-only appearance override; canonical character remains unchanged.'
              : o.resolution === 'permanent'
                ? 'Save a new immutable version in Character DNA, then select that version for this scene.'
                : 'Resolve this appearance change before preparing prompts.',
    });
  }
  const check = (field: string, test: boolean, message: string) => {
    if (test) findings.push({ field, status: 'warning', message });
  };
  check(
    'camera',
    scene.lens === '24mm' && scene.framing === 'Close-up',
    'Wide-angle close-ups may distort facial proportions.',
  );
  check(
    'lighting',
    scene.time === 'Night' && /sun|golden|window/i.test(scene.lighting),
    'Natural daylight conflicts with night; verify your intended light source.',
  );
  check(
    'environment',
    /interior/i.test(scene.environment) && /rain|snow/i.test(scene.weather),
    'Weather is outside the interior; specify a window or sheltered setting.',
  );
  check(
    'outfit',
    /snow|cold/i.test(scene.weather) && /summer|swim/i.test(scene.outfit),
    'Wardrobe may be impractical for cold weather.',
  );
  check(
    'pose',
    /walking/i.test(scene.activity) && /seated/i.test(scene.pose),
    'Walking activity and seated pose may be physically inconsistent.',
  );
  check(
    'realism',
    !!dna && dna.answers.realismLevel !== scene.realism,
    'Scene realism differs from the character baseline; signature imperfections remain fixed.',
  );
  check(
    'fashion',
    !!dna && !/canonical/i.test(scene.outfit) && scene.outfit !== dna.answers.fashion,
    'Scene wardrobe differs from canonical fashion; this is scene-only.',
  );
  if (!findings.length)
    findings.push({
      field: 'scene',
      status: 'compatible',
      message:
        'No structured continuity issues detected. Custom prose still requires human review.',
    });
  return findings;
}
