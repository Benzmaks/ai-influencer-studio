'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, ArrowUp, ArrowDown, Copy, Film, Save } from 'lucide-react';
import type { ProviderCapabilities } from '@/ai/contracts';
import { defaultShot, mockShotWarnings, type ShotInput } from '@/features/videos/schema';
import type { CharacterOption, SceneOption } from './image-studio';
import type { ApprovedImage, BoardView, VideoJob } from './video-types';
import { VideoHistory, useVideoJobs, videoRequest } from './video-history';
const cleanShot = (s: ShotInput): ShotInput =>
  Object.fromEntries(
    Object.entries(s).filter(([k]) => !['id', 'revisionId', 'shotNumber'].includes(k)),
  ) as ShotInput;
export function VideoStudio({
  projectId,
  characters,
  scenes,
  initialBoards,
  initialJobs,
  images,
  capabilities,
  canWrite,
  initialBoardId,
}: {
  projectId: string;
  characters: CharacterOption[];
  scenes: SceneOption[];
  initialBoards: BoardView[];
  initialJobs: VideoJob[];
  images: ApprovedImage[];
  capabilities: ProviderCapabilities;
  canWrite: boolean;
  initialBoardId?: string;
}) {
  const initial = initialBoards.find((b) => b.id === initialBoardId) ?? initialBoards[0];
  const [boards, setBoards] = useState(initialBoards),
    [board, setBoard] = useState<BoardView | null>(initial ?? null);
  const [title, setTitle] = useState(initial?.title ?? 'My first storyboard');
  const fallbackScene = scenes[0]?.versions[0];
  const [characterVersionId, setCharacterVersion] = useState(
    initial?.versions[0]?.characterVersionId ??
      fallbackScene?.characterVersionId ??
      characters[0]?.versions[0]?.id ??
      '',
  );
  const [sceneVersionId, setSceneVersion] = useState(
    initial?.versions[0]?.sceneVersionId ?? fallbackScene?.id ?? '',
  );
  const [shots, setShots] = useState<ShotInput[]>(
    initial?.versions[0]?.shots.map(cleanShot) ?? [defaultShot()],
  );
  const [selected, setSelected] = useState(0),
    [dirty, setDirty] = useState(!initial);
  const [revisionId, setRevisionId] = useState(initial?.versions[0]?.id ?? '');
  const [mode, setMode] = useState<'generate' | 'image-to-video'>('generate'),
    [sourceImageId, setSourceImage] = useState('');
  const [seed, setSeed] = useState(42),
    [model, setModel] = useState(capabilities.models[0]);
  const [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const requestKey = useRef<{ hash: string; key: string } | null>(null);
  const history = useVideoJobs(projectId, initialJobs);
  const current = shots[selected],
    character = characters.find((c) => c.versions.some((v) => v.id === characterVersionId));
  const selectedScene = scenes.flatMap((s) => s.versions).find((v) => v.id === sceneVersionId);
  const generationRevision = board?.versions.find((v) => v.id === revisionId);
  const approved = images.filter(
    (i) =>
      i.generation.characterVersionId === generationRevision?.characterVersionId &&
      i.generation.sceneVersionId === generationRevision?.sceneVersionId,
  );
  const warnings = mockShotWarnings(shots);
  function loadBoard(b: BoardView | null) {
    setBoard(b);
    setTitle(b?.title ?? 'Untitled storyboard');
    setCharacterVersion(
      b?.versions[0]?.characterVersionId ?? fallbackScene?.characterVersionId ?? '',
    );
    setSceneVersion(b?.versions[0]?.sceneVersionId ?? fallbackScene?.id ?? '');
    setShots(b?.versions[0]?.shots.map(cleanShot) ?? [defaultShot()]);
    setRevisionId(b?.versions[0]?.id ?? '');
    setSelected(0);
    setDirty(!b);
    setError('');
    setNotice('');
    setSourceImage('');
  }
  function updateShot(patch: Partial<ShotInput>) {
    setShots((previous) => previous.map((s, i) => (i === selected ? { ...s, ...patch } : s)));
    setDirty(true);
  }
  function reorder(direction: number) {
    const next = [...shots];
    [next[selected], next[selected + direction]] = [next[selected + direction], next[selected]];
    setShots(next);
    setSelected(selected + direction);
    setDirty(true);
  }
  async function save(status: 'draft' | 'ready') {
    setPending(true);
    setError('');
    setNotice('');
    try {
      const b = await videoRequest<BoardView>(
        `/api/projects/${projectId}/storyboards${board ? '/' + board.id : ''}`,
        {
          method: board ? 'PUT' : 'POST',
          body: JSON.stringify({
            title,
            characterVersionId,
            sceneVersionId,
            shots,
            status,
            ...(board ? { revision: board.revision } : {}),
          }),
        },
      );
      setBoards((previous) => [b, ...previous.filter((row) => row.id !== b.id)]);
      loadBoard(b);
      setNotice(`Storyboard saved as immutable revision ${b.revision}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Storyboard could not be saved.');
    } finally {
      setPending(false);
    }
  }
  async function duplicate() {
    if (!board) return;
    setPending(true);
    setError('');
    try {
      const b = await videoRequest<BoardView>(
        `/api/projects/${projectId}/storyboards/${board.id}/duplicate`,
        { method: 'POST' },
      );
      setBoards((previous) => [b, ...previous]);
      loadBoard(b);
      setNotice('Independent draft copy created.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Duplication failed.');
    } finally {
      setPending(false);
    }
  }
  async function generate() {
    setPending(true);
    setError('');
    setNotice('');
    const input = {
      storyboardRevisionId: revisionId,
      operation: mode,
      provider: capabilities.id,
      model,
      seed,
      ...(mode === 'image-to-video' ? { sourceImageId } : {}),
    };
    const hash = JSON.stringify(input);
    if (requestKey.current?.hash !== hash) requestKey.current = { hash, key: crypto.randomUUID() };
    try {
      const job = await videoRequest<VideoJob>(`/api/projects/${projectId}/videos`, {
        method: 'POST',
        headers: { 'idempotency-key': requestKey.current.key },
        body: hash,
      });
      history.append(job);
      requestKey.current = null;
      setNotice('Mock video batch queued. Start the media worker and Redis if it remains queued.');
      document.getElementById('video-history')?.scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation request failed.');
    } finally {
      setPending(false);
    }
  }
  if (!characters.length || !scenes.length)
    return (
      <>
        <section className="panel empty">
          <Film size={32} />
          <h2>A story needs a character and a place.</h2>
          <p>
            Create a complete Character DNA profile and save a Scene first. Then build your shot
            list here.
          </p>
          <div className="form-actions">
            <Link className="button primary" href="/characters/new">
              Create a character
            </Link>
            <Link className="button" href="/scenes/new">
              Create a scene
            </Link>
          </div>
        </section>
        <VideoHistory projectId={projectId} state={history} canWrite={canWrite} />
      </>
    );
  return (
    <div className="video-workspace">
      <section className="panel video-intro">
        <span className="eyebrow">PLAN THE PERFORMANCE. KEEP THE IDENTITY.</span>
        <p>
          Turn a scene into a shot-by-shot creative plan. Each saved revision stays intact, with
          Character DNA, Visual Bible and Realism DNA pinned to every mock preview.
        </p>
        <span className="badge">Mock only · No AI costs · Private assets</span>
      </section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="video-notice" role="status">
          {notice}
        </p>
      )}
      {!canWrite && (
        <p className="video-notice">
          Viewer access: explore saved storyboards and previews. Editing and generation require an
          owner or editor.
        </p>
      )}
      <section className="panel" aria-label="Storyboard editor">
        <div className="page-heading">
          <div>
            <span className="eyebrow">01 · SHAPE YOUR STORY</span>
            <h2>Storyboard</h2>
          </div>
          <div className="form-actions">
            <button
              className="button"
              disabled={!canWrite || pending}
              onClick={() => loadBoard(null)}
            >
              <Plus size={16} />
              New storyboard
            </button>
            {board && (
              <button
                className="button"
                disabled={!canWrite || pending || dirty}
                onClick={() => void duplicate()}
              >
                <Copy size={16} />
                Duplicate storyboard
              </button>
            )}
          </div>
        </div>
        <label className="field">
          Saved storyboard
          <select
            aria-label="Saved storyboard"
            value={board?.id ?? ''}
            disabled={pending}
            onChange={(e) => loadBoard(boards.find((b) => b.id === e.target.value) ?? null)}
          >
            <option value="">New unsaved storyboard</option>
            {boards.map((b) => (
              <option value={b.id} key={b.id}>
                {b.title} · {b.status} · revision {b.revision}
              </option>
            ))}
          </select>
        </label>
        <fieldset disabled={!canWrite || pending} className="video-fieldset">
          <div className="form-grid">
            <label className="field full">
              Storyboard title
              <input
                value={title}
                maxLength={500}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setDirty(true);
                }}
              />
            </label>
            <label className="field">
              Character
              <select
                aria-label="Character"
                value={character?.id ?? ''}
                onChange={(e) => {
                  const id = characters.find((c) => c.id === e.target.value)?.versions[0]?.id ?? '';
                  setCharacterVersion(id);
                  const s = scenes
                    .flatMap((s) => s.versions)
                    .find((v) => v.characterVersionId === id);
                  setSceneVersion(s?.id ?? '');
                  setDirty(true);
                }}
              >
                {characters.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Exact Character DNA version
              <select
                aria-label="Exact Character DNA version"
                value={characterVersionId}
                onChange={(e) => {
                  setCharacterVersion(e.target.value);
                  setSceneVersion(
                    scenes
                      .flatMap((s) => s.versions)
                      .find((v) => v.characterVersionId === e.target.value)?.id ?? '',
                  );
                  setDirty(true);
                }}
              >
                {character?.versions.map((v) => (
                  <option value={v.id} key={v.id}>
                    Character DNA v{v.versionNumber}
                  </option>
                ))}
              </select>
            </label>
            <label className="field full">
              Exact scene version
              <select
                aria-label="Exact scene version"
                value={sceneVersionId}
                onChange={(e) => {
                  setSceneVersion(e.target.value);
                  setDirty(true);
                }}
              >
                <option value="">Choose a matching saved scene</option>
                {scenes.map((s) => (
                  <optgroup label={s.title} key={s.id}>
                    {s.versions
                      .filter((v) => v.characterVersionId === characterVersionId)
                      .map((v) => (
                        <option value={v.id} key={v.id}>
                          {s.title} · scene v{v.versionNumber}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>
          <div className="video-shot-layout">
            <aside className="video-shot-list" aria-label="Storyboard shots">
              <span className="eyebrow">
                {shots.length} SHOTS · {shots.reduce((n, s) => n + s.duration, 0)} SECONDS PLANNED
              </span>
              {shots.map((s, i) => (
                <button
                  className={`video-shot-card ${selected === i ? 'selected' : ''}`}
                  key={i}
                  aria-pressed={selected === i}
                  onClick={() => setSelected(i)}
                >
                  <span className="video-shot-number">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <strong>Shot {i + 1}</strong>
                    <small>
                      {s.framing} · {s.duration}s
                    </small>
                    <small>{s.expression}</small>
                  </span>
                </button>
              ))}
              <button
                className="button"
                disabled={shots.length >= 8}
                onClick={() => {
                  setShots([...shots, defaultShot()]);
                  setSelected(shots.length);
                  setDirty(true);
                }}
              >
                <Plus size={15} />
                Add shot
              </button>
            </aside>
            <div className="video-shot-inspector">
              <div className="page-heading">
                <h3>Shot {selected + 1} · The moment</h3>
                <div className="form-actions">
                  <button
                    className="button"
                    aria-label="Move shot earlier"
                    disabled={selected === 0}
                    onClick={() => reorder(-1)}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    className="button"
                    aria-label="Move shot later"
                    disabled={selected === shots.length - 1}
                    onClick={() => reorder(1)}
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    className="button"
                    disabled={shots.length >= 8}
                    onClick={() => {
                      setShots([...shots, structuredClone(current)]);
                      setSelected(shots.length);
                      setDirty(true);
                    }}
                  >
                    Duplicate shot
                  </button>
                </div>
              </div>
              <div className="form-grid">
                <label className="field">
                  Duration (seconds)
                  <input
                    type="number"
                    min={0.5}
                    max={30}
                    step={0.5}
                    value={current.duration}
                    onChange={(e) => updateShot({ duration: Number(e.target.value) })}
                  />
                </label>
                {(
                  [
                    'framing',
                    'camera',
                    'subject',
                    'action',
                    'expression',
                    'environment',
                    'cameraMovement',
                    'transition',
                    'audio',
                    'dialogue',
                  ] as const
                ).map((field) => (
                  <label className="field" key={field}>
                    {
                      {
                        framing: 'Framing',
                        camera: 'Camera / lens',
                        subject: 'Subject',
                        action: 'Action',
                        expression: 'Expression',
                        environment: 'Environment',
                        cameraMovement: 'Camera movement',
                        transition: 'Transition',
                        audio: 'Audio notes (not synthesized)',
                        dialogue: 'Dialogue notes (not synthesized)',
                      }[field]
                    }
                    <input
                      value={current[field]}
                      maxLength={500}
                      list={
                        ['framing', 'expression', 'cameraMovement', 'transition'].includes(field)
                          ? `video-${field}`
                          : undefined
                      }
                      onChange={(e) => updateShot({ [field]: e.target.value })}
                    />
                  </label>
                ))}
              </div>
              <details className="video-performance">
                <summary>Facial expression & motion planning</summary>
                <p>
                  Planning fields for the future Facial Expression and Motion Realism Bible. The
                  mock sample does not render or validate these movements.
                </p>
                <div className="form-grid">
                  {(['mouthMovement', 'smileTransition', 'eyeMouthCoordination'] as const).map(
                    (field) => (
                      <label className="field full" key={field}>
                        {
                          {
                            mouthMovement: 'Mouth movement',
                            smileTransition: 'Smile-to-laughter transition',
                            eyeMouthCoordination: 'Eye–mouth coordination',
                          }[field]
                        }
                        <input
                          maxLength={500}
                          value={current.performance[field]}
                          onChange={(e) =>
                            updateShot({
                              performance: { ...current.performance, [field]: e.target.value },
                            })
                          }
                        />
                      </label>
                    ),
                  )}
                  {(['onset', 'peak', 'release'] as const).map((field) => (
                    <label className="field" key={field}>
                      {field[0].toUpperCase() + field.slice(1)} (seconds)
                      <input
                        type="number"
                        min={0}
                        max={current.duration}
                        step={0.1}
                        value={current.performance[field]}
                        onChange={(e) =>
                          updateShot({
                            performance: {
                              ...current.performance,
                              [field]: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </details>
              <button
                className="button"
                disabled={shots.length === 1}
                onClick={() => {
                  setShots(shots.filter((_, i) => i !== selected));
                  setSelected(Math.max(0, selected - 1));
                  setDirty(true);
                }}
              >
                Remove shot
              </button>
            </div>
          </div>
          <div className="form-actions">
            <button className="button" onClick={() => void save('draft')}>
              <Save size={15} />
              Save draft
            </button>
            <button className="button primary" onClick={() => void save('ready')}>
              Save storyboard
            </button>
            <span className="badge">
              {dirty ? 'Unsaved changes' : `Saved · revision ${board?.revision}`}
            </span>
          </div>
        </fieldset>
        {board && (
          <details>
            <summary>Immutable storyboard history ({board.versions.length})</summary>
            {board.versions.map((v) => (
              <div className="video-history-revision" key={v.id}>
                <h3>
                  {v.title} · revision {v.versionNumber}
                </h3>
                <p>
                  {v.shots.length} shots · Character DNA {v.characterVersionId} · Scene{' '}
                  {v.sceneVersionId}
                </p>
                <ol>
                  {v.shots.map((s) => (
                    <li key={s.id}>
                      {s.framing} · {s.duration}s · {s.action} · {s.expression}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </details>
        )}
        <datalist id="video-framing">
          {['Wide', 'Medium portrait', 'Close-up', 'Full body'].map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <datalist id="video-expression">
          {['Neutral', 'Soft smile', 'Smile to laughter', 'Thoughtful', 'Joyful'].map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <datalist id="video-cameraMovement">
          {['Locked-off', 'Slow push-in', 'Gentle pan', 'Handheld'].map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <datalist id="video-transition">
          {['Cut', 'Dissolve', 'Fade'].map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </section>
      <section className="panel" aria-label="Video generation settings">
        <span className="eyebrow">02 · PREVIEW THE SEQUENCE</span>
        <h2>Make a mock preview</h2>
        <p>
          This provider returns one fixed silent 320 × 400, two-second clip per shot. Repeated clips
          are samples, not generated variations. Your prompts, timing and references are saved; the
          sample does not visually perform them.
        </p>
        <div className="video-mode-cards">
          {(['generate', 'image-to-video'] as const)
            .filter((m) => capabilities.operations.includes(m))
            .map((m) => (
              <button
                className={`video-mode-card ${mode === m ? 'selected' : ''}`}
                aria-pressed={mode === m}
                key={m}
                disabled={pending}
                onClick={() => setMode(m)}
              >
                <Film size={20} />
                <strong>{m === 'generate' ? 'Text-to-video' : 'Image-to-video'}</strong>
                <small>
                  {m === 'generate'
                    ? 'Pin your storyboard and scene'
                    : 'Use a favourite or final approved image'}
                </small>
              </button>
            ))}
        </div>
        <fieldset disabled={!canWrite || pending} className="video-fieldset">
          <div className="form-grid">
            <label className="field">
              Storyboard revision to generate
              <select
                value={revisionId}
                onChange={(e) => {
                  setRevisionId(e.target.value);
                  setSourceImage('');
                }}
              >
                <option value="">Save a storyboard first</option>
                {board?.versions.map((v) => (
                  <option value={v.id} key={v.id}>
                    Revision {v.versionNumber} · {v.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Mock provider / model
              <select
                aria-label="Mock provider / model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                {capabilities.models.map((m) => (
                  <option key={m} value={m}>
                    {capabilities.id} / {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Reproducibility seed
              <input
                type="number"
                min={0}
                max={2147483600}
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value))}
              />
            </label>
            {mode === 'image-to-video' && (
              <label className="field full">
                Approved source image
                <select
                  aria-label="Approved source image"
                  value={sourceImageId}
                  onChange={(e) => setSourceImage(e.target.value)}
                >
                  <option value="">Choose a favourite or final image</option>
                  {approved.map((a) => (
                    <option value={a.id} key={a.id}>
                      {String(a.metadata.characterName)} · {a.id.slice(-8)}
                    </option>
                  ))}
                </select>
                {!approved.length && (
                  <span>
                    No matching approved image. Favourite an image from these exact character/scene
                    versions in Images or Assets, then reload this page.
                  </span>
                )}
              </label>
            )}
          </div>
          {dirty && (
            <p className="video-notice">
              Save your changes before generating. You can also choose an earlier immutable
              revision.
            </p>
          )}
          {warnings.map((w) => (
            <p className="video-notice" key={w}>
              {w}
            </p>
          ))}
          <button
            className="button primary"
            disabled={
              !revisionId ||
              dirty ||
              pending ||
              (mode === 'image-to-video' && !sourceImageId) ||
              !!generationRevision?.shots.some((s) => s.duration !== 2)
            }
            onClick={() => void generate()}
          >
            {pending ? 'Preparing…' : 'Generate mock video'}
          </button>
        </fieldset>
        <details>
          <summary>Continuity & scene reference</summary>
          <p>
            Scene references are locked to the saved Character DNA version. Final shot prompts,
            negative prompts and facial planning are stored with the generation.
          </p>
          {selectedScene?.prompt.findings.map((f, i) => (
            <p key={i}>
              <strong>{f.status}</strong> · {f.message}
            </p>
          ))}
          <pre>{selectedScene?.prompt.positive}</pre>
          <p>
            Unsupported with this provider: video variations, editing, extension, reference-video
            input, rendered dialogue, facial motion validation and stitched films.
          </p>
        </details>
      </section>
      <VideoHistory projectId={projectId} state={history} canWrite={canWrite} />
    </div>
  );
}
