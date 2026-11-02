import { notFound } from 'next/navigation';
import { workspace } from '@/lib/workspace';
import { getCharacter } from '@/features/characters/service';
import { AppError } from '@/lib/errors';
import { CharacterForm } from '@/components/character-form';
export default async function Edit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, project, canWrite } = await workspace();
  if (!project) notFound();
  const c = await getCharacter(user.id, project.id, id).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Refine the story.</h1>
          <p>Save a new identity version. Previous snapshots remain untouched.</p>
        </div>
      </div>
      <section className="panel">
        {canWrite && !c.archivedAt && c.currentVersion ? (
          <CharacterForm
            projectId={project.id}
            character={{ ...c.currentVersion, id: c.id, revision: c.revision }}
          />
        ) : (
          <p>Editing requires an active character and editor or owner access.</p>
        )}
      </section>
    </>
  );
}
