import Link from 'next/link';
import { workspace } from '@/lib/workspace';
import { listCharacters, getCharacter } from '@/features/characters/service';
import { listScenes, getScene } from '@/features/scenes/service';
import { listStoryboards, listVideoGenerations, approvedImages } from '@/features/videos/service';
import { providerRegistry } from '@/ai/mock';
import { VideoStudio } from '@/components/video-studio';
import type { BoardView, VideoJob, ApprovedImage } from '@/components/video-types';
import type { SceneOption } from '@/components/image-studio';
export default async function Videos({
  searchParams,
}: {
  searchParams: Promise<{ storyboard?: string }>;
}) {
  const { user, project, canWrite } = await workspace();
  if (!project)
    return (
      <section className="panel">
        <h1>Videos</h1>
        <Link className="button primary" href="/projects">
          Choose or create a project
        </Link>
      </section>
    );
  const [allCharacters, allScenes, boards, jobs, images] = await Promise.all([
    listCharacters(user.id, project.id),
    listScenes(user.id, project.id),
    listStoryboards(user.id, project.id),
    listVideoGenerations(user.id, project.id),
    approvedImages(user.id, project.id),
  ]);
  const characters = await Promise.all(
    allCharacters
      .filter((c) => !c.archivedAt)
      .map(async (c) => ({
        id: c.id,
        name: c.name,
        versions: (await getCharacter(user.id, project.id, c.id)).versions.map((v) => ({
          id: v.id,
          versionNumber: v.versionNumber,
        })),
      })),
  );
  const scenes = await Promise.all(allScenes.map((s) => getScene(user.id, project.id, s.id)));
  return (
    <>
      <span className="eyebrow">A WORLD IN MOTION</span>
      <div className="page-heading">
        <div>
          <h1>Videos</h1>
          <p>Every story begins with a moment. Make yours intentional.</p>
        </div>
        <span className="badge">Mock Video Studio</span>
      </div>
      <VideoStudio
        key={`${project.id}-${(await searchParams).storyboard ?? ''}`}
        projectId={project.id}
        canWrite={canWrite}
        characters={characters}
        scenes={JSON.parse(JSON.stringify(scenes)) as SceneOption[]}
        initialBoards={JSON.parse(JSON.stringify(boards)) as BoardView[]}
        initialJobs={JSON.parse(JSON.stringify(jobs)) as VideoJob[]}
        images={JSON.parse(JSON.stringify(images)) as ApprovedImage[]}
        capabilities={providerRegistry().video.capabilities}
        initialBoardId={(await searchParams).storyboard}
      />
    </>
  );
}
