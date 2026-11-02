import { listDrafts, saveDraft } from '@/features/characters/drafts';
import { requireUser, verifyOrigin } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
type Context = { params: Promise<{ projectId: string }> };
export async function GET(_r: Request, { params }: Context) {
  try {
    const user = await requireUser();
    return Response.json(await listDrafts(user.id, (await params).projectId));
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(r: Request, { params }: Context) {
  try {
    verifyOrigin(r);
    const user = await requireUser();
    return Response.json(await saveDraft(user.id, (await params).projectId, await r.json()), {
      status: 201,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
