import { duplicateCharacter } from '@/features/characters/service';
import { requireUser, verifyOrigin } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
export async function POST(
  r: Request,
  { params }: { params: Promise<{ projectId: string; id: string }> },
) {
  try {
    verifyOrigin(r);
    const user = await requireUser();
    const { projectId, id } = await params;
    return Response.json(await duplicateCharacter(user.id, projectId, id), { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
