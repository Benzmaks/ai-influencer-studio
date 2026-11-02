import { z } from 'zod';
import { Role } from '@prisma/client';
import { setMemberRole } from '@/features/projects/service';
import { requireUser, verifyOrigin } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
type Context = { params: Promise<{ projectId: string; userId: string }> };
export async function PATCH(request: Request, { params }: Context) {
  try {
    verifyOrigin(request);
    const actor = await requireUser();
    const { projectId, userId } = await params;
    const { role } = z.object({ role: z.enum(Role) }).parse(await request.json());
    return Response.json(await setMemberRole(actor.id, projectId, userId, role));
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    verifyOrigin(request);
    const actor = await requireUser();
    const { projectId, userId } = await params;
    return Response.json(await setMemberRole(actor.id, projectId, userId, null));
  } catch (e) {
    return errorResponse(e);
  }
}
