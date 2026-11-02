import { requireUser, verifyOrigin } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
import { reviewAsset } from '@/features/generation/service';
type Context = { params: Promise<{ projectId: string; id: string }> };
export async function PATCH(request: Request, { params }: Context) {
  try {
    verifyOrigin(request);
    const u = await requireUser();
    const { projectId, id } = await params;
    return Response.json(await reviewAsset(u.id, projectId, id, (await request.json()).review));
  } catch (e) {
    return errorResponse(e);
  }
}
