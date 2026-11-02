'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type AssetDetail, versionLabel } from './asset-types';
export function AssetComparison({
  projectId,
  items,
  canWrite,
}: {
  projectId: string;
  items: AssetDetail[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [zoom, setZoom] = useState<Record<string, number>>({}),
    [error, setError] = useState(''),
    [pending, setPending] = useState(false);
  async function final(item: AssetDetail) {
    setPending(true);
    setError('');
    try {
      const r = await fetch(`/api/projects/${projectId}/assets/${item.rootAssetId}/final`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: item.asset.id, revision: item.selection?.revision ?? 0 }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Selection failed.');
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <p>
        Compare up to four versions. On a small screen, swipe the comparison strip. Zoom each image
        independently; final selection is saved per original.
      </p>
      <div className="comparison-strip" aria-label="Side-by-side image comparison">
        {items.map((item, i) => {
          const a = item.asset,
            z = zoom[a.id] ?? 1;
          return (
            <section className="panel comparison-card" key={a.id}>
              <span className="eyebrow">
                VERSION {item.history.findIndex((x) => x.id === a.id) + 1}
              </span>
              <h2>{versionLabel(a)}</h2>
              <span className="badge">
                {item.selection?.assetId === a.id ? 'Final selection' : a.review}
              </span>
              <label className="field">
                Zoom image {i + 1}
                <input
                  aria-label={`Zoom image ${i + 1}`}
                  type="range"
                  min="1"
                  max="3"
                  step="0.25"
                  value={z}
                  onChange={(e) => setZoom({ ...zoom, [a.id]: Number(e.target.value) })}
                />
              </label>
              <div className="zoom-window">
                <Image
                  unoptimized
                  src={`/api/projects/${projectId}/assets/${a.id}/file`}
                  alt={`Comparison MOCK image ${i + 1}`}
                  width={480}
                  height={480}
                  style={{ width: `${z * 100}%`, maxWidth: 'none', height: 'auto' }}
                />
              </div>
              <p>
                {String(a.metadata.characterName)} · Character v
                {String(a.metadata.characterVersion)} · Scene v{String(a.metadata.sceneVersion)}
              </p>
              <p>
                Seed {String(a.metadata.seed)} · {String(a.metadata.aspectRatio)}
              </p>
              {Boolean(a.metadata.instruction) && <p>{String(a.metadata.instruction)}</p>}
              <div className="inline">
                {canWrite && a.review !== 'rejected' && (
                  <button className="button primary" disabled={pending} onClick={() => final(item)}>
                    {item.selection?.assetId === a.id ? 'Selected final' : 'Select preferred final'}
                  </button>
                )}
                <Link className="button" href={`/assets/${a.id}`}>
                  Edit & history
                </Link>
                <a
                  className="button"
                  href={`/api/projects/${projectId}/assets/${a.id}/file?download=1`}
                  download
                >
                  Download
                </a>
              </div>
              <details>
                <summary>Version metadata</summary>
                <pre className="scene-prompt">
                  {JSON.stringify(
                    {
                      assetId: a.id,
                      parent: a.sourceAssetId,
                      checksum: a.checksum,
                      createdAt: a.createdAt,
                      ...a.metadata,
                    },
                    null,
                    2,
                  )}
                </pre>
              </details>
            </section>
          );
        })}
      </div>
    </>
  );
}
