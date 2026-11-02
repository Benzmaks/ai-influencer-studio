import Link from 'next/link';
import { workspace } from '@/lib/workspace';
import { listScenes } from '@/features/scenes/service';
export default async function Scenes() {
  const { user, project, canWrite } = await workspace();
  const scenes = project ? await listScenes(user.id, project.id) : [];
  return (
    <>
      <span className="eyebrow">SET THE SCENE. TELL A STORY.</span>
      <div className="page-heading">
        <div>
          <h1>Scenes</h1>
          <p>Shape a moment. Keep your character consistent.</p>
        </div>
        {project && canWrite && (
          <Link className="button primary" href="/scenes/new">
            Create scene
          </Link>
        )}
      </div>
      {scenes.length ? (
        <div className="grid">
          {scenes.map((s) => (
            <Link key={s.id} className="panel draft-card" href={`/scenes/${s.id}`}>
              <span className="badge">
                {s.status} · v{s.revision}
              </span>
              <h2>{s.title}</h2>
              <p>Exact character version pinned · no media generated</p>
              <span className="text-link">Open scene →</span>
            </Link>
          ))}
        </div>
      ) : (
        <section className="panel empty">
          <h2>A new setting for your story.</h2>
          <p>
            Create a scene with a saved Character DNA profile. Drafts and ready scenes will appear
            here.
          </p>
          <Link className="button" href={project && canWrite ? '/scenes/new' : '/projects'}>
            {project && canWrite ? 'Create your first scene' : 'Choose a project'}
          </Link>
        </section>
      )}
    </>
  );
}
