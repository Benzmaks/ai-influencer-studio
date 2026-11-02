import Link from 'next/link';
import { notFound } from 'next/navigation';
import { workspace } from '@/lib/workspace';
import { getAsset } from '@/features/assets/service';
import { AppError } from '@/lib/errors';
import { AssetEditor } from '@/components/asset-editor';
import type { AssetDetail } from '@/components/asset-types';
export default async function AssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, project, canWrite } = await workspace();
  if (!project) notFound();
  const { id } = await params;
  const detail = await getAsset(user.id, project.id, id).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  return (
    <>
      <Link className="text-link" href="/assets">
        ← Asset library
      </Link>
      <div className="page-heading">
        <div>
          <h1>Image editor</h1>
          <p>A new direction. Every original preserved.</p>
        </div>
        <span className="badge">Simulated mock edits</span>
      </div>
      <AssetEditor
        key={id}
        projectId={project.id}
        initial={JSON.parse(JSON.stringify(detail)) as AssetDetail}
        canWrite={canWrite}
      />
    </>
  );
}
