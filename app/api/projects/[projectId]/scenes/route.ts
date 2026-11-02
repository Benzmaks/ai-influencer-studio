import { requireUser, verifyOrigin } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
import { listScenes, saveScene } from '@/features/scenes/service';
type Context = { params: Promise<{ projectId: string }> };
export async function GET(_request: Request, { params }: Context) {
  try {
    const u = await requireUser();
    const { projectId } = await params;
    return Response.json(await listScenes(u.id, projectId));
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request, { params }: Context) {
  try {
    verifyOrigin(request);
    const u = await requireUser();
    const { projectId } = await params;
    return Response.json(await saveScene(u.id, projectId, await request.json()), { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
