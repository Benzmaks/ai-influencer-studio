import Link from 'next/link';
import { workspace } from '@/lib/workspace';
import { listCharacters, getCharacter } from '@/features/characters/service';
import { listScenes, getScene } from '@/features/scenes/service';
import { listGenerations } from '@/features/generation/service';
import { ImageStudio, type ImageJob, type SceneOption } from '@/components/image-studio';
export default async function Images() {
  const { user, project, canWrite } = await workspace();
  if (!project)
    return (
      <section className="panel">
        <h1>Images</h1>
        <Link href="/projects" className="button primary">
          Choose or create a project
        </Link>
      </section>
    );
  const [characterList, sceneList, jobs] = await Promise.all([
    listCharacters(user.id, project.id),
    listScenes(user.id, project.id),
    listGenerations(user.id, project.id),
  ]);
  const characters = await Promise.all(
    characterList
      .filter((c) => !c.archivedAt)
      .map(async (c) => {
        const d = await getCharacter(user.id, project.id, c.id);
        return {
          id: c.id,
          name: c.name,
          versions: d.versions.map((v) => ({ id: v.id, versionNumber: v.versionNumber })),
        };
      }),
  );
  const scenes = await Promise.all(sceneList.map((s) => getScene(user.id, project.id, s.id)));
  return (
    <>
      <span className="eyebrow">A NEW PERSPECTIVE, EVERY TIME</span>
      <div className="page-heading">
        <div>
          <h1>Images</h1>
          <p>From character to scene to a frame worth keeping.</p>
        </div>
        <span className="badge">Mock Image Studio</span>
      </div>
      <ImageStudio
        key={project.id}
        projectId={project.id}
        characters={characters}
        scenes={JSON.parse(JSON.stringify(scenes)) as SceneOption[]}
        initialJobs={JSON.parse(JSON.stringify(jobs)) as ImageJob[]}
        canWrite={canWrite}
      />
    </>
  );
}
