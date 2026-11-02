import { requireUser, verifyOrigin } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
import { selectFinal } from '@/features/assets/service';
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; id: string }> },
) {
  try {
    verifyOrigin(request);
    const u = await requireUser();
    const { projectId, id } = await params;
    return Response.json(await selectFinal(u.id, projectId, id, await request.json()));
  } catch (e) {
    return errorResponse(e);
  }
}
