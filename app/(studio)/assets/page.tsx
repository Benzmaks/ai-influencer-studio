import Link from 'next/link';
import { workspace } from '@/lib/workspace';
import { assetLibrary } from '@/features/assets/service';
import { AssetLibrary } from '@/components/asset-library';
import type { LibraryView } from '@/components/asset-types';
export default async function Assets() {
  const { user, project, canWrite } = await workspace();
  const data = project ? await assetLibrary(user.id, project.id) : null;
  return (
    <>
      <span className="eyebrow">YOUR PRIVATE CREATIVE LIBRARY</span>
      <div className="page-heading">
        <div>
          <h1>Assets</h1>
          <p>Organize your frames. Explore their history. Find your final.</p>
        </div>
        <Link className="button primary" href="/images">
          Open Image Studio
        </Link>
      </div>
      {project && data ? (
        <AssetLibrary
          key={project.id}
          projectId={project.id}
          initial={JSON.parse(JSON.stringify(data)) as LibraryView}
          canWrite={canWrite}
        />
      ) : (
        <Link href="/projects">Choose a project</Link>
      )}
    </>
  );
}
