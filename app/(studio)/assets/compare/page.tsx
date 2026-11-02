import Link from 'next/link';
import { ZodError } from 'zod';
import { workspace } from '@/lib/workspace';
import { compareAssets } from '@/features/assets/service';
import { AppError } from '@/lib/errors';
import { AssetComparison } from '@/components/asset-comparison';
import type { AssetDetail } from '@/components/asset-types';
export default async function Compare({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { user, project, canWrite } = await workspace();
  const { ids } = await searchParams;
  if (!project || !ids)
    return (
      <section className="panel">
        <h1>Compare versions</h1>
        <Link href="/assets">Choose 2–4 images in Assets</Link>
      </section>
    );
  let items;
  try {
    items = await compareAssets(user.id, project.id, ids.split(','));
  } catch (e) {
    if (!(e instanceof AppError) && !(e instanceof ZodError)) throw e;
    return (
      <section className="panel">
        <h1>Compare versions</h1>
        <p role="alert">
          {e instanceof AppError
            ? e.message
            : 'Choose 2–4 different completed images from the active project.'}
        </p>
        <Link className="button" href="/assets">
          Return to asset library
        </Link>
      </section>
    );
  }
  return (
    <>
      <Link className="text-link" href="/assets">
        ← Asset library
      </Link>
      <div className="page-heading">
        <div>
          <h1>Compare versions</h1>
          <p>Look closely. Choose your final frame.</p>
        </div>
      </div>
      <AssetComparison
        projectId={project.id}
        items={JSON.parse(JSON.stringify(items)) as AssetDetail[]}
        canWrite={canWrite}
      />
    </>
  );
}
