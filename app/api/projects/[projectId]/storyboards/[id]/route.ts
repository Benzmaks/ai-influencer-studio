import { requireUser, verifyOrigin } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
import { getStoryboard, saveStoryboard } from '@/features/videos/service';
type Context = { params: Promise<{ projectId: string; id: string }> };
export async function GET(_request: Request, { params }: Context) {
  try {
    const u = await requireUser();
    const p = await params;
    return Response.json(await getStoryboard(u.id, p.projectId, p.id));
  } catch (e) {
    return errorResponse(e);
  }
}
export async function PUT(request: Request, { params }: Context) {
  try {
    verifyOrigin(request);
    const u = await requireUser();
    const p = await params;
    return Response.json(await saveStoryboard(u.id, p.projectId, await request.json(), p.id));
  } catch (e) {
    return errorResponse(e);
  }
}
