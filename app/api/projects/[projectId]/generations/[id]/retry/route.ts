import { requireUser, verifyOrigin } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
import { retryGeneration } from '@/features/generation/service';
type Context = { params: Promise<{ projectId: string; id: string }> };
export async function POST(request: Request, { params }: Context) {
  try {
    verifyOrigin(request);
    const u = await requireUser();
    const { projectId, id } = await params;
    return Response.json(await retryGeneration(u.id, projectId, id));
  } catch (e) {
    return errorResponse(e);
  }
}
