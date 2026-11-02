import { requireUser, verifyOrigin } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
import { listStoryboards, saveStoryboard } from '@/features/videos/service';
type Context = { params: Promise<{ projectId: string }> };
export async function GET(_request: Request, { params }: Context) {
  try {
    const u = await requireUser();
    return Response.json(await listStoryboards(u.id, (await params).projectId));
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request, { params }: Context) {
  try {
    verifyOrigin(request);
    const u = await requireUser();
    return Response.json(
      await saveStoryboard(u.id, (await params).projectId, await request.json()),
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
