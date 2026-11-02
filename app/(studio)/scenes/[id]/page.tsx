import { notFound } from 'next/navigation';
import { workspace } from '@/lib/workspace';
import { listCharacters, getCharacter } from '@/features/characters/service';
import { getScene } from '@/features/scenes/service';
import { SceneBuilder } from '@/components/scene-builder';
import { AppError } from '@/lib/errors';
export default async function ScenePage({ params }: { params: Promise<{ id: string }> }) {
  const { user, project, canWrite } = await workspace();
  if (!project) notFound();
  const { id } = await params;
  const scene = await getScene(user.id, project.id, id).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  const list = await listCharacters(user.id, project.id);
  const characters = await Promise.all(
    list.map(async (c) => {
      const d = await getCharacter(user.id, project.id, c.id);
      return {
        id: c.id,
        name: c.name,
        versions: d.versions.map((v) => ({
          id: v.id,
          name: v.name,
          versionNumber: v.versionNumber,
        })),
      };
    }),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{scene.title}</h1>
          <p>
            {canWrite ? 'Refine the scene. Preserve every version.' : 'Read-only scene review.'}
          </p>
        </div>
      </div>
      <SceneBuilder
        key={scene.id}
        projectId={project.id}
        characters={characters}
        initial={scene}
        readOnly={!canWrite}
      />
    </>
  );
}
