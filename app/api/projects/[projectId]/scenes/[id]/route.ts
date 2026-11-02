import { requireUser, verifyOrigin } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
import { getScene, saveScene } from '@/features/scenes/service';
type Context = { params: Promise<{ projectId: string; id: string }> };
export async function GET(_request: Request, { params }: Context) {
  try {
    const u = await requireUser();
    const { projectId, id } = await params;
    return Response.json(await getScene(u.id, projectId, id));
  } catch (e) {
    return errorResponse(e);
  }
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    verifyOrigin(request);
    const u = await requireUser();
    const { projectId, id } = await params;
    return Response.json(await saveScene(u.id, projectId, await request.json(), id));
  } catch (e) {
    return errorResponse(e);
  }
}
