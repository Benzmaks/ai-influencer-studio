import { createCharacter, listCharacters } from '@/features/characters/service';
import { requireUser, verifyOrigin } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
type Context = { params: Promise<{ projectId: string }> };
export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { projectId } = await params;
    return Response.json(await listCharacters(user.id, projectId));
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request, { params }: Context) {
  try {
    verifyOrigin(request);
    const user = await requireUser();
    const { projectId } = await params;
    return Response.json(await createCharacter(user.id, projectId, await request.json()), {
      status: 201,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
