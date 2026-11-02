/** The experimental WASM path is an explicit local fallback, never a release configuration. */
export function experimentalPrismaAllowed(
  source: Record<string, string | undefined> = process.env,
) {
  if (
    source.STUDIO_PRISMA_ENGINE !== undefined &&
    !['classic', 'experimental'].includes(source.STUDIO_PRISMA_ENGINE)
  )
    throw new Error('STUDIO_PRISMA_ENGINE must be classic or experimental.');
  if (source.STUDIO_PRISMA_ENGINE !== 'experimental') return false;
  if (
    source.NODE_ENV === 'production' ||
    (source.CI !== undefined && source.CI !== '' && source.CI !== 'false')
  )
    throw new Error(
      'Experimental Prisma is forbidden in production and CI. Use the native Prisma 6 engine.',
    );
  return true;
}
