import { cookies } from 'next/headers';
import { createProject, listProjects } from '@/features/projects/service';
import { requireUser, verifyOrigin } from '@/lib/session';
import { errorResponse } from '@/lib/errors';
export async function GET() {
  try {
    const user = await requireUser();
    return Response.json(await listProjects(user.id));
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const user = await requireUser();
    const project = await createProject(user.id, await request.json());
    (await cookies()).set('studio-project', project.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    return Response.json(project, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
