import { workspace } from '@/lib/workspace';
import { ProjectForm } from '@/components/project-form';
export default async function Projects() {
  const { projects, project } = await workspace();
  return (
    <>
      <span className="eyebrow">GIVE YOUR IDEAS A HOME</span>
      <div className="page-heading">
        <div>
          <h1>Your projects</h1>
          <p>Separate worlds. One creative workspace. Select a project in the header.</p>
        </div>
      </div>
      <div className="two-column">
        <section className="panel">
          <h2>Project library</h2>
          {projects.length ? (
            projects.map((p) => (
              <div className="member" key={p.id}>
                <div>
                  <strong>{p.name}</strong>
                  <p>
                    {p.memberships[0].role.toLowerCase()}{' '}
                    {p.id === project?.id ? '· Active project' : ''}
                  </p>
                </div>
                <span className="badge">{p.id === project?.id ? 'Selected' : 'Available'}</span>
              </div>
            ))
          ) : (
            <p>No projects yet. Create your first project to begin.</p>
          )}
        </section>
        <section className="panel">
          <h2>A new beginning.</h2>
          <p>Create a project. You’ll be its first owner.</p>
          <ProjectForm />
        </section>
      </div>
    </>
  );
}
