import { requireUser } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
import { getGeneration } from '@/features/generation/service';
type Context = { params: Promise<{ projectId: string; id: string }> };
export async function GET(request: Request, { params }: Context) {
  try {
    const u = await requireUser();
    const { projectId, id } = await params;
    return Response.json(await getGeneration(u.id, projectId, id));
  } catch (e) {
    return errorResponse(e);
  }
}
