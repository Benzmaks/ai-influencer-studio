import { cookies } from 'next/headers';
import { pageUser } from './session';
import { listProjects } from '@/features/projects/service';
export async function workspace() {
  const user = await pageUser();
  const projects = await listProjects(user.id);
  const selected = (await cookies()).get('studio-project')?.value;
  const project = projects.find((p) => p.id === selected) ?? projects[0] ?? null;
  const role = project?.memberships[0]?.role;
  return { user, projects, project, role, canWrite: role === 'OWNER' || role === 'EDITOR' };
}
