import { requireUser, verifyOrigin } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
import { previewScene } from '@/features/scenes/service';
type Context = { params: Promise<{ projectId: string }> };
export async function POST(request: Request, { params }: Context) {
  try {
    verifyOrigin(request);
    const u = await requireUser();
    const { projectId } = await params;
    return Response.json(await previewScene(u.id, projectId, await request.json()));
  } catch (e) {
    return errorResponse(e);
  }
}
