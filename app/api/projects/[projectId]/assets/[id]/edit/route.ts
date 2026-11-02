import { requireUser, verifyOrigin } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
import { requestEdit } from '@/features/assets/service';
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; id: string }> },
) {
  try {
    verifyOrigin(request);
    const u = await requireUser();
    const { projectId, id } = await params;
    return Response.json(
      await requestEdit(
        u.id,
        projectId,
        id,
        await request.json(),
        request.headers.get('idempotency-key') ?? '',
      ),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
