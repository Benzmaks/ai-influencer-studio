'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { type LibraryView, versionLabel } from './asset-types';
export function AssetLibrary({
  projectId,
  initial,
  canWrite,
}: {
  projectId: string;
  initial: LibraryView;
  canWrite: boolean;
}) {
  const [data, setData] = useState(initial),
    [q, setQ] = useState(''),
    [characterId, setCharacter] = useState(''),
    [sceneId, setScene] = useState(''),
    [review, setReview] = useState('all'),
    [kind, setKind] = useState('all'),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState<string[]>([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false),
    [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
            q,
            characterId,
            sceneId,
            review,
            kind,
            page: String(page),
          }),
          r = await fetch(`/api/projects/${projectId}/assets/library?${params}`, {
            cache: 'no-store',
          });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (active) setData(d);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Library unavailable.');
      } finally {
        if (active) setLoading(false);
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [projectId, q, characterId, sceneId, review, kind, page, reload]);
  async function mark(id: string, value: string) {
    try {
      setError('');
      const r = await fetch(`/api/projects/${projectId}/assets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review: value }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setReload((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Review failed.');
    }
  }
  return (
    <>
      <section className="panel">
        <div className="form-grid">
          <label className="field">
            Search images
            <input
              placeholder="Character, scene or edit instructions"
              value={q}
              maxLength={100}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <label className="field">
            Character filter
            <select
              aria-label="Character filter"
              value={characterId}
              onChange={(e) => {
                setCharacter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All characters</option>
              {data.characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Scene filter
            <select
              aria-label="Scene filter"
              value={sceneId}
              onChange={(e) => {
                setScene(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All scenes</option>
              {data.scenes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Gallery filter
            <select
              aria-label="Gallery filter"
              value={review}
              onChange={(e) => {
                setReview(e.target.value);
                setPage(0);
              }}
            >
              {['all', 'unreviewed', 'favourite', 'rejected', 'final'].map((v) => (
                <option key={v} value={v}>
                  {v === 'all'
                    ? 'All images'
                    : v === 'favourite'
                      ? 'Favourites'
                      : v === 'rejected'
                        ? 'Rejected'
                        : v === 'final'
                          ? 'Final selections'
                          : 'Unreviewed'}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Version type
            <select
              aria-label="Version type"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setPage(0);
              }}
            >
              {['all', 'original', 'variations', 'edit', 'duplicate'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="inline">
          <span role="status">{loading ? 'Searching…' : `${data.total} saved images`}</span>
          {selected.length >= 2 ? (
            <Link className="button primary" href={`/assets/compare?ids=${selected.join(',')}`}>
              Compare selected ({selected.length})
            </Link>
          ) : (
            <span>Select 2–4 images to compare.</span>
          )}
          {selected.length > 0 && (
            <button className="button" onClick={() => setSelected([])}>
              Clear selection
            </button>
          )}
        </div>
      </section>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="image-gallery">
        {data.assets.map((a) => (
          <article className="panel library-card" key={a.id}>
            <label className="field">
              <span>Select image {a.id.slice(-6)} for comparison</span>
              <input
                aria-label={`Compare image ${a.id}`}
                type="checkbox"
                checked={selected.includes(a.id)}
                disabled={!selected.includes(a.id) && selected.length >= 4}
                onChange={(e) =>
                  setSelected(
                    e.target.checked ? [...selected, a.id] : selected.filter((id) => id !== a.id),
                  )
                }
              />
            </label>
            <Link href={`/assets/${a.id}`}>
              <Image
                unoptimized
                src={`/api/projects/${projectId}/assets/${a.id}/file`}
                width={480}
                height={480}
                alt={`MOCK test pattern · ${versionLabel(a)} · ${String(a.metadata.sceneTitle)}`}
              />
            </Link>
            <div className="inline">
              <span className="badge">{versionLabel(a)}</span>
              <span className="badge">
                {a.selection?.assetId === a.id ? 'Final selection' : a.review}
              </span>
            </div>
            <h3>{String(a.metadata.sceneTitle)}</h3>
            <p>
              {String(a.metadata.characterName)} · {new Date(a.createdAt).toLocaleDateString()}
            </p>
            {Boolean(a.metadata.instruction) && <p>{String(a.metadata.instruction)}</p>}
            <div className="inline">
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
              {canWrite && (
                <>
                  <button
                    className="button"
                    aria-pressed={a.review === 'favourite'}
                    onClick={() =>
                      mark(a.id, a.review === 'favourite' ? 'unreviewed' : 'favourite')
                    }
                  >
                    Favourite
                  </button>
                  <button
                    className="button"
                    aria-pressed={a.review === 'rejected'}
                    onClick={() => mark(a.id, a.review === 'rejected' ? 'unreviewed' : 'rejected')}
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      {!data.total && !loading && (
        <section className="panel empty">
          <h2>No matching images.</h2>
          <p>Adjust your filters or create a mock batch in Images.</p>
        </section>
      )}
      <div className="inline library-pagination">
        <button
          className="button"
          disabled={page === 0 || loading}
          onClick={() => setPage(page - 1)}
        >
          Previous page
        </button>
        <span>Page {page + 1}</span>
        <button
          className="button"
          disabled={(page + 1) * 24 >= data.total || loading}
          onClick={() => setPage(page + 1)}
        >
          Next page
        </button>
      </div>
    </>
  );
}
