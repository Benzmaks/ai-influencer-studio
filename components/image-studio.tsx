'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { imageCapabilities } from '@/features/generation/schema';
type Asset = {
  id: string;
  index: number;
  status: string;
  review: string;
  metadata: Record<string, unknown>;
  error: string | null;
};
export type ImageJob = {
  id: string;
  characterId: string;
  sceneId: string;
  status: string;
  progress: number;
  retryCount: number;
  createdAt: string;
  input: Record<string, unknown>;
  assets: Asset[];
  error: string | null;
};
export type SceneOption = {
  id: string;
  title: string;
  versions: {
    id: string;
    versionNumber: number;
    characterVersionId: string;
    characterId: string;
    prompt: {
      ready: boolean;
      positive: string;
      negative: string;
      findings: { status: string; field: string; message: string }[];
    };
    choices: { generationType: string };
  }[];
};
export type CharacterOption = {
  id: string;
  name: string;
  versions: { id: string; versionNumber: number }[];
};
export function ImageStudio({
  projectId,
  characters,
  scenes,
  initialJobs,
  canWrite,
  library = false,
}: {
  projectId: string;
  characters: CharacterOption[];
  scenes: SceneOption[];
  initialJobs: ImageJob[];
  canWrite: boolean;
  library?: boolean;
}) {
  const initialScene = scenes[0],
    initialVersion = initialScene?.versions[0];
  const [characterId, setCharacter] = useState(
    initialVersion?.characterId ?? characters[0]?.id ?? '',
  );
  const [characterVersionId, setCharacterVersion] = useState(
    initialVersion?.characterVersionId ?? characters[0]?.versions[0]?.id ?? '',
  );
  const [sceneId, setScene] = useState(initialScene?.id ?? '');
  const [sceneVersionId, setSceneVersion] = useState(initialVersion?.id ?? '');
  const [count, setCount] = useState(4),
    [aspectRatio, setRatio] = useState('4:5'),
    [seed, setSeed] = useState(42),
    [strength, setStrength] = useState('balanced');
  const [source, setSource] = useState<string | null>(null),
    [jobs, setJobs] = useState(initialJobs),
    [error, setError] = useState(''),
    [pending, setPending] = useState(false),
    [filter, setFilter] = useState('all');
  const [more, setMore] = useState(initialJobs.length === 30);
  const key = useRef<string | null>(null);
  const scene = scenes.find((s) => s.id === sceneId),
    version = scene?.versions.find((v) => v.id === sceneVersionId);
  const character = characters.find((c) => c.id === characterId);
  useEffect(() => {
    let alive = true;
    async function refresh() {
      try {
        const r = await fetch(`/api/projects/${projectId}/generations`, { cache: 'no-store' });
        if (!r.ok) throw new Error('Cannot refresh gallery. Check your session and PostgreSQL.');
        const data = await r.json();
        if (alive)
          setJobs((existing) => {
            const fresh = new Map<string, ImageJob>(data.map((j: ImageJob) => [j.id, j]));
            return [...fresh.values(), ...existing.filter((j) => !fresh.has(j.id))];
          });
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Gallery unavailable.');
      }
    }
    const timer = setInterval(() => void refresh(), 1500);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [projectId]);
  function reset() {
    key.current = null;
    setSource(null);
    setError('');
  }
  async function action(path: string, data?: unknown, method = 'POST') {
    setError('');
    setPending(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(path === 'generations'
            ? { 'idempotency-key': key.current ?? (key.current = crypto.randomUUID()) }
            : {}),
        },
        body: JSON.stringify(data ?? {}),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      if (path === 'generations') key.current = null;
      const updated = await fetch(`/api/projects/${projectId}/generations`, { cache: 'no-store' });
      if (updated.ok) {
        const fresh: ImageJob[] = await updated.json();
        setJobs((existing) => [
          ...fresh,
          ...existing.filter((j) => !fresh.some((n) => n.id === j.id)),
        ]);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Request failed. Retry with the same settings to reuse your request safely.',
      );
    } finally {
      setPending(false);
    }
  }
  function variations(job: ImageJob, a: Asset) {
    const i = job.input;
    setCharacter(job.characterId);
    setCharacterVersion(String(i.characterVersionId));
    setScene(job.sceneId);
    setSceneVersion(String(i.sceneVersionId));
    setRatio(String(i.aspectRatio));
    setSeed(Number(i.seed) + 100);
    setSource(a.id);
    key.current = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  return (
    <>
      {!library && (
        <section className="panel image-workspace">
          <div className="section-title">
            <h2>Frame your next idea.</h2>
            <span className="badge">Mock provider · $0</span>
          </div>
          <p>
            Produce original, deterministic test patterns to exercise your workflow. These are not
            AI-generated character photographs.
          </p>
          <fieldset className="scene-controls" disabled={!canWrite || pending}>
            <div className="form-grid">
              <label className="field">
                Saved character
                <select
                  aria-label="Saved character"
                  value={characterId}
                  onChange={(e) => {
                    reset();
                    setCharacter(e.target.value);
                    setCharacterVersion(
                      characters.find((c) => c.id === e.target.value)?.versions[0]?.id ?? '',
                    );
                    setScene('');
                    setSceneVersion('');
                  }}
                >
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Character version
                <select
                  aria-label="Character version"
                  value={characterVersionId}
                  onChange={(e) => {
                    reset();
                    setCharacterVersion(e.target.value);
                    setScene('');
                    setSceneVersion('');
                  }}
                >
                  {character?.versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      Version {v.versionNumber}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Scene
                <select
                  aria-label="Scene"
                  value={sceneId}
                  onChange={(e) => {
                    reset();
                    setScene(e.target.value);
                    setSceneVersion(
                      scenes
                        .find((s) => s.id === e.target.value)
                        ?.versions.find((v) => v.characterVersionId === characterVersionId)?.id ??
                        '',
                    );
                  }}
                >
                  <option value="">Choose a matching scene</option>
                  {scenes
                    .filter((s) =>
                      s.versions.some((v) => v.characterVersionId === characterVersionId),
                    )
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                </select>
              </label>
              <label className="field">
                Scene version
                <select
                  aria-label="Scene version"
                  value={sceneVersionId}
                  onChange={(e) => {
                    reset();
                    setSceneVersion(e.target.value);
                  }}
                >
                  <option value="">Choose a version</option>
                  {scene?.versions
                    .filter((v) => v.characterVersionId === characterVersionId)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        Version {v.versionNumber}
                      </option>
                    ))}
                </select>
              </label>
              <label className="field">
                Variations
                <select
                  aria-label="Variations"
                  value={count}
                  onChange={(e) => {
                    key.current = null;
                    setCount(Number(e.target.value));
                  }}
                >
                  {imageCapabilities.batchSizes.map((n) => (
                    <option key={n} value={n}>
                      {n} images
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Aspect ratio
                <select
                  aria-label="Aspect ratio"
                  value={aspectRatio}
                  onChange={(e) => {
                    key.current = null;
                    setRatio(e.target.value);
                  }}
                >
                  {imageCapabilities.aspectRatios.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Provider / model
                <select aria-label="Provider / model" value="mock-image" onChange={() => {}}>
                  <option value="mock-image">Mock Image · studio-sample-v1</option>
                </select>
              </label>
              <label className="field">
                Seed
                <input
                  type="number"
                  min={0}
                  max={2147483600}
                  value={seed}
                  onChange={(e) => {
                    key.current = null;
                    setSeed(Number(e.target.value));
                  }}
                />
              </label>
              {source && (
                <label className="field">
                  Variation strength
                  <select
                    aria-label="Variation strength"
                    value={strength}
                    onChange={(e) => {
                      key.current = null;
                      setStrength(e.target.value);
                    }}
                  >
                    {imageCapabilities.variationStrengths.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </fieldset>
          {source && (
            <p>
              Making mock pattern variations from a saved original.{' '}
              <button
                className="button"
                onClick={() => {
                  reset();
                }}
                disabled={pending}
              >
                Clear source
              </button>
            </p>
          )}
          {version ? (
            <details open>
              <summary>Assembled prompt & continuity</summary>
              {version.prompt.findings.map((f, i) => (
                <p key={i}>
                  <strong>
                    {f.status} · {f.field}
                  </strong>{' '}
                  — {f.message}
                </p>
              ))}
              <h3>Positive prompt</h3>
              <pre className="scene-prompt">
                {version.prompt.positive || 'Resolve scene conflicts first.'}
              </pre>
              <h3>Negative prompt</h3>
              <pre className="scene-prompt">{version.prompt.negative}</pre>
            </details>
          ) : (
            <p>
              Select matching character and scene versions.{' '}
              <Link className="text-link" href="/scenes/new">
                Create a scene →
              </Link>
            </p>
          )}
          {canWrite ? (
            <button
              className="button primary"
              disabled={
                pending ||
                !version?.prompt.ready ||
                version.choices.generationType !== 'image' ||
                !Number.isInteger(seed) ||
                seed < 0 ||
                seed > 2147483600
              }
              onClick={() =>
                action('generations', {
                  characterVersionId,
                  sceneVersionId,
                  count,
                  aspectRatio,
                  seed,
                  provider: 'mock-image',
                  model: 'studio-sample-v1',
                  variationStrength: strength,
                  ...(source ? { sourceAssetId: source } : {}),
                })
              }
            >
              {pending ? 'Submitting…' : 'Generate mock images'}
            </button>
          ) : (
            <p>
              Viewer access: review and download existing results. Creating and reviewing images
              requires editor or owner access.
            </p>
          )}
          <p className="muted">
            Generation runs in a background worker. If a batch stays queued, start Redis and the
            image worker using the preview launcher or development instructions.
          </p>
        </section>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="section-title">
        <h2>{library ? 'Image library' : 'Your image batches'}</h2>
        <label className="field">
          Gallery filter
          <select
            aria-label="Gallery filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All images</option>
            <option value="favourite">Favourites</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
      </div>
      {!jobs.length && (
        <section className="panel empty">
          <h3>Your first frame is waiting.</h3>
          <p>Generate a mock batch to populate your private project gallery.</p>
        </section>
      )}
      {jobs.map((job) => (
        <section key={job.id} className="panel image-batch" aria-label={`Batch ${job.id}`}>
          <div className="section-title">
            <h3>
              {String(job.input.sceneTitle)} · {job.assets.length} results
            </h3>
            <span className="badge">{job.status}</span>
          </div>
          <progress aria-label="Generation progress" value={job.progress} max={100} />
          <p>
            {job.progress}% · {String(job.input.label)} · {new Date(job.createdAt).toLocaleString()}
          </p>
          {job.error && <p role="status">{job.error}</p>}
          <div className="inline">
            {canWrite && ['queued', 'processing'].includes(job.status) && (
              <button
                className="button"
                disabled={pending}
                onClick={() => action(`generations/${job.id}/cancel`)}
              >
                Cancel batch
              </button>
            )}
            {canWrite && ['failed', 'partial'].includes(job.status) && job.retryCount < 3 && (
              <button
                className="button"
                disabled={pending}
                onClick={() => action(`generations/${job.id}/retry`)}
              >
                Retry failed results
              </button>
            )}
            <Link className="text-link" href={`/characters/${job.characterId}`}>
              View character
            </Link>
            <Link className="text-link" href={`/scenes/${job.sceneId}`}>
              View scene
            </Link>
          </div>
          <div className="image-gallery">
            {job.assets
              .filter((a) => filter === 'all' || a.review === filter)
              .map((a) => (
                <article className="image-result" key={a.id}>
                  {a.status === 'completed' ? (
                    <Image
                      unoptimized
                      src={`/api/projects/${projectId}/assets/${a.id}/file`}
                      alt={`MOCK test pattern ${a.index + 1}; not AI photography`}
                      width={480}
                      height={480}
                    />
                  ) : (
                    <div className="image-placeholder">
                      Result {a.index + 1} · {a.status}
                    </div>
                  )}
                  <div className="image-result-body">
                    <span className="badge">
                      Mock · {a.status} · {a.review}
                    </span>
                    {a.error && <p>{a.error}</p>}
                    {a.status === 'completed' && (
                      <>
                        <div className="inline">
                          {canWrite && (
                            <>
                              <button
                                className="button"
                                aria-pressed={a.review === 'favourite'}
                                disabled={pending}
                                onClick={() =>
                                  action(
                                    `assets/${a.id}`,
                                    {
                                      review: a.review === 'favourite' ? 'unreviewed' : 'favourite',
                                    },
                                    'PATCH',
                                  )
                                }
                              >
                                Favourite
                              </button>
                              <button
                                className="button"
                                aria-pressed={a.review === 'rejected'}
                                disabled={pending}
                                onClick={() =>
                                  action(
                                    `assets/${a.id}`,
                                    { review: a.review === 'rejected' ? 'unreviewed' : 'rejected' },
                                    'PATCH',
                                  )
                                }
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <a
                            className="button"
                            href={`/api/projects/${projectId}/assets/${a.id}/file?download=1`}
                            download
                          >
                            Download
                          </a>
                          {canWrite && !library && (
                            <button
                              className="button"
                              disabled={pending}
                              onClick={() => variations(job, a)}
                            >
                              Create variations
                            </button>
                          )}
                        </div>
                        <Link className="button" href={`/assets/${a.id}`}>
                          {canWrite ? 'Edit & history' : 'View history'}
                        </Link>
                        <details>
                          <summary>Generation details</summary>
                          <p>
                            Character v{String(a.metadata.characterVersion)} · Scene v
                            {String(a.metadata.sceneVersion)} · Seed {String(a.metadata.seed)} ·{' '}
                            {String(a.metadata.aspectRatio)}
                          </p>
                          <pre className="scene-prompt">
                            {JSON.stringify(
                              {
                                ...a.metadata,
                                generationJob: job.id,
                                assetId: a.id,
                                createdAt: job.createdAt,
                                status: a.status,
                              },
                              null,
                              2,
                            )}
                          </pre>
                        </details>
                      </>
                    )}
                  </div>
                </article>
              ))}
          </div>
        </section>
      ))}
      {more && (
        <button
          className="button"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            try {
              const r = await fetch(
                `/api/projects/${projectId}/generations?cursor=${jobs[jobs.length - 1].id}`,
              );
              const data = await r.json();
              if (!r.ok) throw new Error(data.error);
              setJobs([...jobs, ...data]);
              setMore(data.length === 30);
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Unable to load older batches.');
            } finally {
              setPending(false);
            }
          }}
        >
          Load older batches
        </button>
      )}
    </>
  );
}
