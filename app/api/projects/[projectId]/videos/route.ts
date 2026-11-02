import { requireUser, verifyOrigin } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
import { listVideoGenerations, createVideoGeneration } from '@/features/videos/service';
type Context = { params: Promise<{ projectId: string }> };
export async function GET(request: Request, { params }: Context) {
  try {
    const u = await requireUser();
    return Response.json(
      await listVideoGenerations(
        u.id,
        (await params).projectId,
        new URL(request.url).searchParams.get('cursor') ?? undefined,
      ),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request, { params }: Context) {
  try {
    verifyOrigin(request);
    const u = await requireUser();
    return Response.json(
      await createVideoGeneration(
        u.id,
        (await params).projectId,
        await request.json(),
        request.headers.get('idempotency-key') ?? '',
      ),
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
