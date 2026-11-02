import { compileCharacter } from '@/ai/character-engine';
import { requireUser, verifyOrigin } from '@/lib/session';
import { requireMembership } from '@/lib/access';
import { errorResponse } from '@/lib/errors';
export async function POST(r: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    verifyOrigin(r);
    const user = await requireUser();
    await requireMembership(user.id, (await params).projectId, 'write');
    return Response.json(await compileCharacter(await r.json()));
  } catch (e) {
    return errorResponse(e);
  }
}
