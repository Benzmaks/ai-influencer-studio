'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { VideoJob } from './video-types';
export async function videoRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Request failed. Please try again.');
  return data as T;
}
export function useVideoJobs(projectId: string, initial: VideoJob[]) {
  const [jobs, setJobs] = useState(initial),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [hasMore, setHasMore] = useState(initial.length === 30);
  const active = jobs
    .filter((j) => ['queued', 'processing'].includes(j.status))
    .map((j) => j.id)
    .join(',');
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let running = false;
    const timer = setInterval(() => {
      if (running) return;
      running = true;
      void Promise.all(
        active.split(',').map((id) =>
          videoRequest<VideoJob>(`/api/projects/${projectId}/generations/${id}`, {
            signal: controller.signal,
          }),
        ),
      )
        .then((rows) => {
          if (!controller.signal.aborted) {
            setJobs((previous) => previous.map((j) => rows.find((r) => r.id === j.id) ?? j));
            setError('');
          }
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setError(
              'Progress unavailable. Your saved jobs are retained. Check PostgreSQL/Redis and the media worker, then refresh.',
            );
        })
        .finally(() => {
          running = false;
        });
    }, 1500);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [active, projectId]);
  const append = useCallback(
    (job: VideoJob) => setJobs((previous) => [job, ...previous.filter((j) => j.id !== job.id)]),
    [],
  );
  async function action(id: string, action: 'cancel' | 'retry') {
    setBusy(true);
    setError('');
    try {
      await videoRequest(`/api/projects/${projectId}/generations/${id}/${action}`, {
        method: 'POST',
      });
      append(await videoRequest<VideoJob>(`/api/projects/${projectId}/generations/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Job action failed.');
    } finally {
      setBusy(false);
    }
  }
  async function loadMore() {
    setBusy(true);
    setError('');
    try {
      const rows = await videoRequest<VideoJob[]>(
        `/api/projects/${projectId}/videos?cursor=${encodeURIComponent(jobs.at(-1)?.id ?? '')}`,
      );
      setJobs((previous) => [
        ...previous,
        ...rows.filter((r) => !previous.some((j) => j.id === r.id)),
      ]);
      setHasMore(rows.length === 30);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'History unavailable.');
    } finally {
      setBusy(false);
    }
  }
  return { jobs, append, action, loadMore, busy, error, hasMore };
}
export function VideoHistory({
  projectId,
  state,
  canWrite,
}: {
  projectId: string;
  state: ReturnType<typeof useVideoJobs>;
  canWrite: boolean;
}) {
  return (
    <section id="video-history" className="video-history" aria-label="Video generation history">
      <div className="page-heading">
        <div>
          <span className="eyebrow">FROM THE FIRST TAKE ONWARD</span>
          <h2>Video history</h2>
          <p>Immutable shot previews, with the exact creative references used.</p>
        </div>
      </div>
      {state.error && (
        <p role="alert" className="error">
          {state.error}
        </p>
      )}
      {!state.jobs.length && (
        <div className="panel empty">
          <h3>Your first sequence starts here.</h3>
          <p>
            Save a storyboard, then generate a clearly labeled mock preview. No paid keys needed.
          </p>
        </div>
      )}
      {state.jobs.map((job) => (
        <article className="panel video-batch" key={job.id} aria-label={`Video batch ${job.id}`}>
          <div className="page-heading">
            <div>
              <h3>
                {String(job.input.storyboardTitle)} · revision {String(job.input.storyboardVersion)}
              </h3>
              <p>
                {job.input.operation === 'image-to-video' ? 'Image-to-video' : 'Text-to-video'} ·{' '}
                {String(job.input.characterName)} · seed {String(job.input.seed)}
              </p>
            </div>
            <span className="badge">
              {job.status} · {job.progress}%
            </span>
          </div>
          <progress max={100} value={job.progress} aria-label="Video batch progress" />
          <p className="video-disclaimer">
            MOCK · Repeated fixed, silent 2-second sample per shot. No character animation, audio
            synthesis, facial-motion validation or assembled film.
          </p>
          {job.error && (
            <p role="alert" className="error">
              {job.error}
            </p>
          )}
          <div className="video-clips">
            {job.videoAssets.map((asset) => (
              <div className="video-clip" key={asset.id}>
                <span className="eyebrow">SHOT {asset.index + 1} · MOCK SAMPLE</span>
                {asset.status === 'completed' ? (
                  <>
                    <video
                      controls
                      playsInline
                      poster="/mock-video-poster.svg"
                      preload="metadata"
                      aria-label={`Mock shot ${asset.index + 1}`}
                      src={`/api/projects/${projectId}/video-assets/${asset.id}/file`}
                    >
                      <track
                        kind="captions"
                        src="/mock-video-captions.vtt"
                        srcLang="en"
                        label="Mock sample description"
                        default
                      />
                    </video>
                    <a
                      className="button"
                      href={`/api/projects/${projectId}/video-assets/${asset.id}/file?download`}
                    >
                      Download shot {asset.index + 1}
                    </a>
                  </>
                ) : (
                  <div className="video-placeholder">
                    <span>
                      {asset.status === 'pending' ? 'Preparing your mock clip…' : asset.status}
                    </span>
                    {asset.error && <p>{asset.error}</p>}
                  </div>
                )}
                <details>
                  <summary>Shot metadata & references</summary>
                  <pre>{JSON.stringify(asset.metadata, null, 2)}</pre>
                  {asset.checksum && <p className="video-checksum">SHA-256: {asset.checksum}</p>}
                </details>
              </div>
            ))}
          </div>
          <div className="form-actions">
            <Link className="button" href={`/videos?storyboard=${job.storyboardId}`}>
              Open storyboard
            </Link>
            <Link className="button" href={`/characters/${job.characterId}`}>
              Character
            </Link>
            <Link className="button" href={`/scenes/${job.sceneId}`}>
              Scene
            </Link>
            {canWrite && ['queued', 'processing'].includes(job.status) && (
              <button
                className="button"
                disabled={state.busy}
                onClick={() => void state.action(job.id, 'cancel')}
              >
                Cancel video batch
              </button>
            )}
            {canWrite && ['partial', 'failed'].includes(job.status) && job.retryCount < 3 && (
              <button
                className="button"
                disabled={state.busy}
                onClick={() => void state.action(job.id, 'retry')}
              >
                Retry failed shots
              </button>
            )}
            {job.retryCount >= 3 && (
              <p>Retry limit reached. Save a new generation request after resolving the error.</p>
            )}
          </div>
          <details>
            <summary>Generation details</summary>
            <p>
              Saved {new Date(job.createdAt).toLocaleString()} · job {job.id}
            </p>
            <pre>{JSON.stringify(job.input, null, 2)}</pre>
          </details>
        </article>
      ))}
      {state.hasMore && (
        <button className="button" disabled={state.busy} onClick={() => void state.loadMore()}>
          Load earlier video history
        </button>
      )}
    </section>
  );
}
export function VideoLibrary({
  projectId,
  initialJobs,
  canWrite,
}: {
  projectId: string;
  initialJobs: VideoJob[];
  canWrite: boolean;
}) {
  const state = useVideoJobs(projectId, initialJobs);
  return <VideoHistory projectId={projectId} state={state} canWrite={canWrite} />;
}
