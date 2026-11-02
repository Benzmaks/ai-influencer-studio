import { requireUser, verifyOrigin } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
import { listGenerations, createGeneration } from '@/features/generation/service';
type Context = { params: Promise<{ projectId: string }> };
export async function GET(request: Request, { params }: Context) {
  try {
    const u = await requireUser();
    const { projectId } = await params;
    return Response.json(
      await listGenerations(
        u.id,
        projectId,
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
    const { projectId } = await params;
    return Response.json(
      await createGeneration(
        u.id,
        projectId,
        await request.json(),
        request.headers.get('idempotency-key') ?? '',
      ),
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
