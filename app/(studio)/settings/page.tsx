import Link from 'next/link';
import { workspace } from '@/lib/workspace';
import { db } from '@/lib/db';
import { health } from '@/lib/health';
import { MemberControls } from '@/components/member-controls';
export default async function Settings() {
  const { user, project, role } = await workspace();
  const members = project
    ? await db.projectMembership.findMany({
        where: { projectId: project.id },
        include: { user: { select: { id: true, name: true, email: true } } },
      })
    : [];
  const status = await health();
  return (
    <>
      <span className="eyebrow">THE DETAILS BEHIND YOUR STUDIO</span>
      <div className="page-heading">
        <div>
          <h1>Settings</h1>
          <p>Your workspace, your access and your development environment.</p>
        </div>
        <Link href="/projects" className="button">
          Manage projects ↗
        </Link>
      </div>
      <div className="two-column">
        <section className="panel">
          <h2>{project?.name ?? 'No project selected'}</h2>
          <p>
            {user.email} · {role?.toLowerCase() ?? 'No project role'}
          </p>
          <h3>Project members</h3>
          {members.map((m) => (
            <div className="member" key={m.userId}>
              <div>
                <strong>{m.user.name ?? 'Studio member'}</strong>
                <p>{m.user.email}</p>
              </div>
              {role === 'OWNER' ? (
                <MemberControls projectId={m.projectId} userId={m.userId} role={m.role} />
              ) : (
                <span className="badge">{m.role.toLowerCase()}</span>
              )}
            </div>
          ))}
          <p>
            Projects always retain at least one owner. Member invitations are planned; this
            foundation supports existing memberships and role changes.
          </p>
        </section>
        <section className="panel">
          <h2>Environment health</h2>
          {Object.entries(status.checks).map(([name, value]) => (
            <div key={name} className="health-row">
              <span>{name}</span>
              <span>{value}</span>
            </div>
          ))}
          <h3>Provider configuration</h3>
          <p>
            Language, image and video: deterministic mocks. No paid APIs are connected. Generation
            previews remain fixed mock samples; video editing, extension and realistic facial motion
            are not supported.
          </p>
          <span className="badge">Private local storage</span>
        </section>
      </div>
    </>
  );
}
