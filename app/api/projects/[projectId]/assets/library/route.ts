import { requireUser } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
import { assetLibrary } from '@/features/assets/service';
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const u = await requireUser();
    const { projectId } = await params;
    return Response.json(
      await assetLibrary(u.id, projectId, Object.fromEntries(new URL(request.url).searchParams)),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
