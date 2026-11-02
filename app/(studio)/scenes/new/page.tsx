import Link from 'next/link';
import { workspace } from '@/lib/workspace';
import { listCharacters } from '@/features/characters/service';
import { SceneBuilder } from '@/components/scene-builder';
export default async function NewScene() {
  const { user, project, canWrite } = await workspace();
  const characters = project
    ? (await listCharacters(user.id, project.id)).filter((c) => !c.archivedAt)
    : [];
  const complete = project
    ? await Promise.all(
        characters.map(async (c) => {
          const { getCharacter } = await import('@/features/characters/service');
          const detail = await getCharacter(user.id, project.id, c.id);
          return {
            id: c.id,
            name: c.name,
            versions: detail.versions.map((v) => ({
              id: v.id,
              name: v.name,
              versionNumber: v.versionNumber,
            })),
          };
        }),
      )
    : [];
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Create a scene</h1>
          <p>One character. Endless possibilities. No AI costs.</p>
        </div>
      </div>
      {project && canWrite && complete.length ? (
        <SceneBuilder projectId={project.id} characters={complete} />
      ) : (
        <section className="panel">
          <h2>
            {canWrite ? 'Give your scene a character.' : 'Select a project with editing access.'}
          </h2>
          <Link className="button primary" href={canWrite ? '/characters/new' : '/projects'}>
            {canWrite ? 'Create character' : 'Manage projects'}
          </Link>
        </section>
      )}
    </>
  );
}
