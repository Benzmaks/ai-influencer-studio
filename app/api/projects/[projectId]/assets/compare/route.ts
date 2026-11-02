import { requireUser } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
import { compareAssets } from '@/features/assets/service';
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const u = await requireUser();
    const { projectId } = await params;
    return Response.json(
      await compareAssets(
        u.id,
        projectId,
        new URL(request.url).searchParams.get('ids')?.split(',') ?? [],
      ),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
