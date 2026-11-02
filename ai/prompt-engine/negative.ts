import type { SceneInput } from '@/features/scenes/schema';
export function negativePrompt(s: SceneInput) {
  const terms = [
    'incorrect anatomy',
    'plastic skin',
    'waxy skin',
    'excessive smoothing',
    'CGI appearance',
    'watermark',
  ];
  const content = Object.values(s)
    .filter((v) => typeof v === 'string')
    .join(' ');
  if (s.framing !== 'Close-up') terms.push('distorted limbs', 'incorrect body proportions');
  if (/holding|hands|coffee|reading/i.test(content))
    terms.push('extra fingers', 'fused fingers', 'malformed hands');
  if (/mirror|glass|water|rain|reflection/i.test(content))
    terms.push('incorrect reflections', 'incorrect mirror geometry');
  if (/jewel|earring|necklace/i.test(content)) terms.push('warped jewelry');
  if (s.lens === '24mm' || s.camera !== 'Eye level')
    terms.push('impossible perspective', 'facial stretching');
  if (s.realism >= 4) terms.push('excessive HDR', 'unnatural symmetry', 'artificial skin sheen');
  if (s.generationType === 'video')
    terms.push('temporal flicker', 'identity drift between frames', 'inconsistent motion');
  return [...new Set(terms)].join(', ');
}
