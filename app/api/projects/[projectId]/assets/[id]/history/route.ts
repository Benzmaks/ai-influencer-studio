import { requireUser } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
import { getAsset } from '@/features/assets/service';
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; id: string }> },
) {
  try {
    const u = await requireUser();
    const { projectId, id } = await params;
    return Response.json(await getAsset(u.id, projectId, id));
  } catch (e) {
    return errorResponse(e);
  }
}
