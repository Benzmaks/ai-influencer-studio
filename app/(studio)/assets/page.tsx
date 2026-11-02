import Link from 'next/link';
import { workspace } from '@/lib/workspace';
import { listGenerations } from '@/features/generation/service';
import { ImageStudio, type ImageJob } from '@/components/image-studio';
export default async function Assets() {
  const { user, project, canWrite } = await workspace();
  const jobs = project ? await listGenerations(user.id, project.id) : [];
  return (
    <>
      <span className="eyebrow">YOUR PRIVATE CREATIVE LIBRARY</span>
      <div className="page-heading">
        <div>
          <h1>Assets</h1>
          <p>Review, save and download your mock image results.</p>
        </div>
        <Link className="button primary" href="/images">
          Open Image Studio
        </Link>
      </div>
      {project && (
        <ImageStudio
          library
          key={project.id}
          projectId={project.id}
          characters={[]}
          scenes={[]}
          initialJobs={JSON.parse(JSON.stringify(jobs)) as ImageJob[]}
          canWrite={canWrite}
        />
      )}
    </>
  );
}
