import { publishDraft } from '@/features/characters/drafts';
import { requireUser, verifyOrigin } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
export async function POST(
  r: Request,
  { params }: { params: Promise<{ projectId: string; id: string }> },
) {
  try {
    verifyOrigin(r);
    const user = await requireUser();
    const { projectId, id } = await params;
    const body = await r.json();
    return Response.json(await publishDraft(user.id, projectId, id, body.revision));
  } catch (e) {
    return errorResponse(e);
  }
}
