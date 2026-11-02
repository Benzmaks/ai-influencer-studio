import { requireUser, verifyOrigin } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
import { duplicateStoryboard } from '@/features/videos/service';
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; id: string }> },
) {
  try {
    verifyOrigin(request);
    const u = await requireUser();
    const p = await params;
    return Response.json(await duplicateStoryboard(u.id, p.projectId, p.id), { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
