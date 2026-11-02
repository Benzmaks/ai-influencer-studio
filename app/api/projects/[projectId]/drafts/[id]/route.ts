import { getDraft, saveDraft, discardDraft } from '@/features/characters/drafts';
import { requireUser, verifyOrigin } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
type Context = { params: Promise<{ projectId: string; id: string }> };
export async function GET(_r: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { projectId, id } = await params;
    return Response.json(await getDraft(user.id, projectId, id));
  } catch (e) {
    return errorResponse(e);
  }
}
export async function PATCH(r: Request, { params }: Context) {
  try {
    verifyOrigin(r);
    const user = await requireUser();
    const { projectId, id } = await params;
    const body = await r.json();
    return Response.json(await saveDraft(user.id, projectId, body, id, body.revision));
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(r: Request, { params }: Context) {
  try {
    verifyOrigin(r);
    const user = await requireUser();
    const { projectId, id } = await params;
    const body = await r.json();
    return Response.json(await discardDraft(user.id, projectId, id, body.revision));
  } catch (e) {
    return errorResponse(e);
  }
}
