'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { type AssetDetail, versionLabel } from './asset-types';
const presets = [
  'Change the outfit to a black evening dress.',
  'Change the background to a Paris café.',
  'Adjust the lighting to golden hour.',
  'Change the facial expression to a soft smile while preserving the character.',
  'Make the image more candid and photographic.',
];
export function AssetEditor({
  projectId,
  initial,
  canWrite,
}: {
  projectId: string;
  initial: AssetDetail;
  canWrite: boolean;
}) {
  const [detail, setDetail] = useState(initial),
    [instruction, setInstruction] = useState(presets[0]),
    [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [count, setCount] = useState(1);
  const requestKey = useRef<string | null>(null);
  useEffect(() => {
    let alive = true;
    const timer = setInterval(async () => {
      try {
        const r = await fetch(`/api/projects/${projectId}/assets/${initial.asset.id}/history`, {
          cache: 'no-store',
        });
        if (!r.ok) return;
        const d = await r.json();
        if (alive) setDetail(d);
      } catch {
        /* Keep the persisted snapshot on transient network failure. */
      }
    }, 1500);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [projectId, initial.asset.id]);
  async function send(kind: 'edit' | 'duplicate' | 'final', assetId = detail.asset.id) {
    setPending(true);
    setError('');
    setNotice('');
    try {
      const url =
        kind === 'final' ? `assets/${detail.rootAssetId}/final` : `assets/${assetId}/${kind}`;
      const r = await fetch(`/api/projects/${projectId}/${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'idempotency-key': requestKey.current ?? (requestKey.current = crypto.randomUUID()),
        },
        body: JSON.stringify(
          kind === 'edit'
            ? { instruction, scope: 'scene-only', count }
            : kind === 'final'
              ? { assetId, revision: detail.selection?.revision ?? 0 }
              : {},
        ),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      requestKey.current = null;
      setNotice(
        kind === 'edit'
          ? 'Mock edit queued. Follow its progress in the version tree.'
          : kind === 'duplicate'
            ? 'Duplicate queued. Original bytes will remain unchanged.'
            : 'Final image selected.',
      );
      const fresh = await fetch(`/api/projects/${projectId}/assets/${initial.asset.id}/history`);
      if (fresh.ok) setDetail(await fresh.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to complete request.');
    } finally {
      setPending(false);
    }
  }
  const asset = detail.asset;
  const depth = (id: string) => {
    let n = 0,
      current = detail.history.find((a) => a.id === id);
    const seen = new Set<string>();
    while (current?.sourceAssetId && !seen.has(current.id)) {
      seen.add(current.id);
      n++;
      current = detail.history.find((a) => a.id === current!.sourceAssetId);
    }
    return Math.min(n, 8);
  };
  return (
    <>
      <div className="editor-layout">
        <section className="panel">
          <Image
            className="editor-image"
            unoptimized
            src={`/api/projects/${projectId}/assets/${asset.id}/file`}
            width={600}
            height={600}
            alt="Source MOCK image; not AI photography"
          />
          <div className="inline">
            <span className="badge">{versionLabel(asset)}</span>
            <span className="badge">{asset.review}</span>
            {detail.selection?.assetId === asset.id && (
              <span className="badge">Final selection</span>
            )}
          </div>
          <p>
            Character v{String(asset.metadata.characterVersion)} · Scene v
            {String(asset.metadata.sceneVersion)} · Seed {String(asset.metadata.seed)}
          </p>
          <div className="inline">
            <a
              className="button"
              href={`/api/projects/${projectId}/assets/${asset.id}/file?download=1`}
              download
            >
              Download original
            </a>
            {canWrite && (
              <button className="button" disabled={pending} onClick={() => send('duplicate')}>
                Duplicate image
              </button>
            )}
            <Link className="text-link" href={`/characters/${asset.generation.characterId}`}>
              Character profile
            </Link>
            <Link className="text-link" href={`/scenes/${asset.generation.sceneId}`}>
              Scene
            </Link>
          </div>
          <details>
            <summary>Original metadata & preservation references</summary>
            <pre className="scene-prompt">
              {JSON.stringify(
                {
                  metadata: asset.metadata,
                  checksum: asset.checksum,
                  characterVersionId: asset.generation.characterVersionId,
                  sceneVersionId: asset.generation.sceneVersionId,
                },
                null,
                2,
              )}
            </pre>
          </details>
        </section>
        <section className="panel">
          <span className="eyebrow">REFINE THE FRAME</span>
          <h2>Describe your edit.</h2>
          <p>
            This creates a new mock pattern using your source image and instructions. It does not
            retouch pixels into real photography.
          </p>
          <fieldset disabled={!canWrite || pending} className="scene-controls">
            <div className="choice-grid">
              {presets.map((p, i) => (
                <button
                  type="button"
                  key={p}
                  className={`choice-card ${instruction === p ? 'selected' : ''}`}
                  onClick={() => {
                    setInstruction(p);
                    requestKey.current = null;
                  }}
                >
                  {['Outfit', 'Background', 'Golden hour', 'Expression', 'Candid realism'][i]}
                </button>
              ))}
            </div>
            <label className="field">
              Editing instructions
              <textarea
                aria-label="Editing instructions"
                rows={5}
                maxLength={1500}
                minLength={5}
                value={instruction}
                onChange={(e) => {
                  setInstruction(e.target.value);
                  requestKey.current = null;
                }}
              />
            </label>
            <label className="field">
              Edited results
              <select
                aria-label="Edited results"
                value={count}
                onChange={(e) => {
                  setCount(Number(e.target.value));
                  requestKey.current = null;
                }}
              >
                {[1, 2, 4, 8].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <p>
              <strong>Image-only edit.</strong> Canonical identity, facial/body structure and
              signature features stay locked. For permanent changes,{' '}
              <Link className="text-link" href={`/characters/${asset.generation.characterId}/dna`}>
                publish a new Character DNA version
              </Link>
              , then create a new scene/original.
            </p>
            <button
              className="button primary"
              disabled={pending || instruction.trim().length < 5}
              onClick={() => send('edit')}
            >
              {pending ? 'Submitting…' : 'Request mock edit'}
            </button>
          </fieldset>
          {!canWrite && (
            <p>Viewer access: download and compare; editing requires an owner or editor.</p>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
        </section>
      </div>
      <section className="panel version-tree">
        <div className="section-title">
          <h2>Image version tree</h2>
          <span className="badge">Original → Variations → Edits → Final</span>
        </div>
        <p>
          Choose a completed child to edit it again. Each branch retains its exact parent and
          effective instructions.
        </p>
        <ol>
          {detail.history.map((a, i) => (
            <li key={a.id} style={{ marginLeft: `${depth(a.id) * 12}px` }}>
              <div className="version-node">
                {a.status === 'completed' && (
                  <Image
                    unoptimized
                    src={`/api/projects/${projectId}/assets/${a.id}/file`}
                    width={70}
                    height={70}
                    alt={`MOCK version ${i + 1}`}
                  />
                )}
                <div>
                  <strong>
                    Version {i + 1} · {versionLabel(a)}
                  </strong>
                  <p>
                    {a.status === 'pending'
                      ? `${a.generation.status} · ${a.generation.progress}%`
                      : a.status}
                    {detail.selection?.assetId === a.id ? ' · FINAL SELECTION' : ''} ·{' '}
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                  {a.metadata.instruction ? <p>{String(a.metadata.instruction)}</p> : null}
                  {a.sourceAssetId && (
                    <small>
                      Parent: Version{' '}
                      {detail.history.findIndex((p) => p.id === a.sourceAssetId) + 1}
                    </small>
                  )}
                </div>
              </div>
              {a.status === 'completed' && (
                <div className="inline">
                  <Link className="button" href={`/assets/${a.id}`}>
                    Open version
                  </Link>
                  {a.id !== asset.id && (
                    <Link className="button" href={`/assets/compare?ids=${asset.id},${a.id}`}>
                      Compare with source
                    </Link>
                  )}
                  {canWrite && a.review !== 'rejected' && (
                    <button
                      className="button"
                      disabled={pending}
                      onClick={() => send('final', a.id)}
                    >
                      {detail.selection?.assetId === a.id ? 'Selected final' : 'Select final'}
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
