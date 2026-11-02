import { getCharacter, updateCharacter, archiveCharacter } from '@/features/characters/service';
import { requireUser, verifyOrigin } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
type Context = { params: Promise<{ projectId: string; id: string }> };
export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { projectId, id } = await params;
    return Response.json(await getCharacter(user.id, projectId, id));
  } catch (e) {
    return errorResponse(e);
  }
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    verifyOrigin(request);
    const user = await requireUser();
    const { projectId, id } = await params;
    const body = await request.json();
    return Response.json(await updateCharacter(user.id, projectId, id, body, body.revision));
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    verifyOrigin(request);
    const user = await requireUser();
    const { projectId, id } = await params;
    const body = await request.json();
    return Response.json(await archiveCharacter(user.id, projectId, id, body.revision));
  } catch (e) {
    return errorResponse(e);
  }
}
