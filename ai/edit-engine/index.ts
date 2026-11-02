import { readSnapshot } from '@/features/characters/dna';
export function planEdit(snapshot: unknown, instruction: string) {
  const dna = readSnapshot(snapshot);
  if (!dna)
    return {
      status: 'conflict' as const,
      targets: [] as string[],
      message: 'A complete pinned Character DNA profile is required for editing.',
    };
  // Deliberately conservative English rules, not an AI or a promise of semantic understanding.
  const request = instruction
    .toLowerCase()
    .split(/while preserving|while keeping|without changing|and preserve|and keep/)[0];
  const mutation =
    /change|remove|replace|alter|reshape|different|erase|smooth|enlarge|reduce|make|give|add|adjust|turn/;
  const protectedTerms =
    /\b(?:face shape|facial structure|bone structure|jaw|nose|lips?|chin|cheekbones?|eye shape|eyebrows?|eye colou?r|body proportions|body shape|height|age|skin tone|skin colou?r|freckles|beauty marks?|birthmarks?|scar|moles?|signature|tattoo)\b/;
  const targets = [
    ['outfit', /outfit|dress|clothes|clothing|wardrobe|jacket|shirt/],
    ['background', /background|location|café|cafe|environment|beach/],
    ['lighting', /light|golden hour|sunset|exposure/],
    ['expression', /expression|smile|mood|laugh/],
    ['style', /candid|photographic|realism|documentary/],
    ['temporary appearance', /hair|makeup|accessor/],
  ] as const;
  const selected = targets.filter(([, test]) => test.test(request)).map(([name]) => name);
  const signatureHair =
    dna.answers.signatureFeatures.some((s) => /hair/i.test(s)) && /hair/.test(request);
  const signatureAccessories =
    dna.answers.signatureFeatures.some((s) =>
      /hoop|earring|jewel|necklace|bracelet|accessor/i.test(s),
    ) && /accessor|hoop|earring|jewel|necklace|bracelet/.test(request);
  const namedSignature = dna.answers.signatureFeatures.some(
    (s) => s.trim().length > 3 && request.includes(s.toLowerCase()),
  );
  if (
    mutation.test(request) &&
    (protectedTerms.test(request) || signatureHair || signatureAccessories || namedSignature)
  )
    return {
      status: 'conflict' as const,
      targets: selected,
      message:
        'This request affects protected identity or signature anchors. Edit Character DNA explicitly, publish a new character/scene version and generate a new original. Existing image history stays pinned.',
    };
  return {
    status:
      selected.length && !selected.includes('temporary appearance')
        ? ('compatible' as const)
        : ('warning' as const),
    targets: selected.length ? selected : ['custom'],
    message: selected.length
      ? 'Image-only mock edit. Unrelated identity and signature anchors remain locked.'
      : 'Custom text requires human review. This simulation cannot understand every identity-changing instruction; all canonical and signature anchors remain locked.',
  };
}
export function editContext(snapshot: unknown) {
  const dna = readSnapshot(snapshot);
  if (!dna) throw new Error('Complete Character DNA required.');
  return {
    characterDNA: dna.profile.characterDNA,
    visualBible: dna.profile.visualBible,
    realismDNA: dna.profile.realismDNA,
    signatureFeatures: dna.answers.signatureFeatures,
    signatureImperfections: dna.answers.signatureImperfections,
  };
}
export function editPrompt(sourcePrompt: string, instruction: string, targets: string[]) {
  return `${sourcePrompt}\n\nIMAGE-ONLY EDIT (${targets.join(', ')}): ${instruction}\nApply only the requested changes to the supplied source image. Preserve all unrelated character identity, body proportions, signature features and imperfections from the exact saved reference. This is a simulated mock edit, not real image processing.`;
}
