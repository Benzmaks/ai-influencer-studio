import { cookies } from 'next/headers';
import { z } from 'zod';
import { requireUser, verifyOrigin } from '@/lib/session';
import { requireMembership } from '@/lib/access';
import { errorResponse } from '@/lib/errors';
export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const user = await requireUser();
    const { projectId } = z.object({ projectId: z.string().min(1) }).parse(await request.json());
    await requireMembership(user.id, projectId);
    (await cookies()).set('studio-project', projectId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    return Response.json({ selected: true });
  } catch (e) {
    return errorResponse(e);
  }
}
