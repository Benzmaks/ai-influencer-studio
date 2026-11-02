'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  defaultScene,
  overrideLabels,
  sceneConcepts,
  sceneFields,
  type SceneInput,
} from '@/features/scenes/schema';
import type { compileScene } from '@/ai/prompt-engine';
type CharacterOption = {
  id: string;
  name: string;
  versions: { id: string; versionNumber: number; name: string }[];
};
type Saved = {
  id: string;
  revision: number;
  status: string;
  versions: {
    characterVersionId: string;
    choices: unknown;
    prompt: unknown;
    versionNumber: number;
  }[];
};
const steps = [
  'Your character',
  'The setting',
  'Style & action',
  'Through the lens',
  'Continuity & review',
];
export function SceneBuilder({
  projectId,
  characters,
  initial,
  readOnly = false,
}: {
  projectId: string;
  characters: CharacterOption[];
  initial?: Saved;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const latest = initial?.versions[0];
  const [choices, setChoices] = useState<SceneInput>(
    (latest?.choices as SceneInput) ?? defaultScene(),
  );
  const [characterVersionId, setCharacter] = useState(
    latest?.characterVersionId ?? characters[0]?.versions[0]?.id ?? '',
  );
  const [saved, setSaved] = useState(initial);
  const [step, setStep] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState<ReturnType<typeof compileScene> | null>(
    (latest?.prompt as ReturnType<typeof compileScene>) ?? null,
  );
  const [concepts, setConcepts] = useState<SceneInput[]>([]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);
  function change(next: SceneInput) {
    setChoices(next);
    setDirty(true);
    setPreview(null);
    setNotice('');
  }
  async function request(action: 'draft' | 'ready' | 'preview' | 'duplicate') {
    setPending(true);
    setError('');
    setNotice('');
    try {
      const endpoint =
        action === 'duplicate'
          ? `/${saved?.id}/duplicate`
          : action === 'preview'
            ? '/preview'
            : saved
              ? `/${saved.id}`
              : '';
      const response = await fetch(`/api/projects/${projectId}/scenes${endpoint}`, {
        method: action === 'duplicate' || action === 'preview' || !saved ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          choices,
          characterVersionId,
          status: action === 'ready' ? 'ready' : 'draft',
          revision: saved?.revision,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (action === 'preview') {
        setPreview(result);
        setNotice('Prompts prepared from your current choices. Save to keep them.');
      } else if (action === 'duplicate') {
        router.push(`/scenes/${result.id}`);
      } else {
        setSaved(result);
        setDirty(false);
        setPreview(result.versions[0].prompt);
        setNotice(
          action === 'ready'
            ? 'Scene ready. No image or video has been generated.'
            : 'Draft saved. Resume it from Scenes.',
        );
        if (!saved) router.replace(`/scenes/${result.id}`);
        else router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save scene.');
    } finally {
      setPending(false);
    }
  }
  const selected = characters.find((c) => c.versions.some((v) => v.id === characterVersionId));
  const fields = sceneFields.filter(([key]) =>
    step === 1
      ? ['location', 'environment', 'weather', 'time', 'atmosphere'].includes(key)
      : step === 2
        ? ['activity', 'outfit', 'accessories', 'pose', 'expression', 'mood'].includes(key)
        : step === 3
          ? [
              'camera',
              'framing',
              'lens',
              'depthOfField',
              'lighting',
              'composition',
              'candidness',
              'photographyStyle',
            ].includes(key)
          : false,
  );
  return (
    <>
      <div className="wizard scene-builder">
        <aside className="wizard-steps panel">
          <span className="eyebrow">SCENE BUILDER</span>
          <ol>
            {steps.map((name, i) => (
              <li key={name}>
                <button
                  type="button"
                  className={step === i ? 'active' : ''}
                  onClick={() => setStep(i)}
                >
                  <span>{i + 1}</span>
                  {name}
                </button>
              </li>
            ))}
          </ol>
          <p>{dirty ? 'Unsaved changes' : 'Save a draft at any step.'}</p>
          <Link
            className="text-link"
            href="/scenes"
            onClick={(e) => {
              if (dirty && !confirm('Leave without saving your current changes?'))
                e.preventDefault();
            }}
          >
            ← Scene library
          </Link>
        </aside>
        <section className="panel wizard-content">
          <div className="wizard-top">
            <span className="eyebrow">STEP {step + 1} OF 5</span>
            <span className="badge">
              {saved?.status ?? 'New draft'}
              {dirty ? ' · unsaved' : ''}
            </span>
          </div>
          <progress aria-label="Scene progress" value={step + 1} max={5} />
          <h2>{steps[step]}</h2>
          <fieldset disabled={readOnly || pending} className="scene-controls">
            {step === 0 && (
              <div className="form-grid">
                <label className="field">
                  Scene title
                  <input
                    value={choices.title}
                    maxLength={500}
                    onChange={(e) => change({ ...choices, title: e.target.value })}
                  />
                </label>
                <label className="field">
                  Saved influencer
                  <select
                    aria-label="Saved influencer"
                    value={selected?.id ?? ''}
                    onChange={(e) => {
                      setCharacter(characters.find((c) => c.id === e.target.value)!.versions[0].id);
                      setDirty(true);
                      setPreview(null);
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
                      setCharacter(e.target.value);
                      setDirty(true);
                      setPreview(null);
                    }}
                  >
                    {selected?.versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        Version {v.versionNumber} · {v.name}
                      </option>
                    ))}
                  </select>
                </label>
                <p>
                  Each scene keeps this exact character version. Your canonical character stays
                  unchanged.
                </p>
                <label className="field">
                  Prompt target
                  <select
                    aria-label="Prompt target"
                    value={choices.generationType}
                    onChange={(e) =>
                      change({ ...choices, generationType: e.target.value as 'image' | 'video' })
                    }
                  >
                    <option value="image">Photography / image</option>
                    <option value="video">Video prompt only</option>
                  </select>
                </label>
                <p>No media generation or paid APIs in this phase.</p>
              </div>
            )}
            <div className="form-grid">
              {fields.map(([key, label, options]) => (
                <fieldset key={key} className="wizard-field">
                  <legend>{label}</legend>
                  <div className="choice-grid">
                    {options.map((o) => (
                      <button
                        type="button"
                        key={o}
                        className={`choice-card ${choices[key] === o ? 'selected' : ''}`}
                        aria-pressed={choices[key] === o}
                        onClick={() => change({ ...choices, [key]: o })}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                  <label className="field">
                    Custom {label.toLowerCase()}
                    <input
                      maxLength={500}
                      value={String(choices[key])}
                      onChange={(e) => change({ ...choices, [key]: e.target.value })}
                    />
                  </label>
                </fieldset>
              ))}
            </div>
            {step === 1 && (
              <>
                <button
                  type="button"
                  className="button"
                  onClick={() => setConcepts(sceneConcepts(choices))}
                >
                  Explore 3 mock concepts
                </button>
                <div className="grid">
                  {concepts.map((c) => (
                    <button
                      type="button"
                      className="choice-card"
                      key={c.title}
                      onClick={() => {
                        change(c);
                        setConcepts([]);
                      }}
                    >
                      {c.title}
                      <br />
                      {c.location} · {c.lighting}
                    </button>
                  ))}
                </div>
                <p>Deterministic mock presets. Select one to apply; save it as its own scene.</p>
              </>
            )}
            {step === 3 && (
              <fieldset className="wizard-field">
                <legend>Realism level</legend>
                <div className="choice-grid">
                  {['Editorial', 'Polished', 'Natural', 'Candid', 'Documentary'].map((name, i) => (
                    <button
                      type="button"
                      key={name}
                      aria-pressed={choices.realism === i + 1}
                      className={`choice-card ${choices.realism === i + 1 ? 'selected' : ''}`}
                      onClick={() => change({ ...choices, realism: i + 1 })}
                    >
                      {i + 1} · {name}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            {step === 4 && (
              <>
                <p>
                  Review your choices and resolve appearance changes. Checks cover structured
                  options; review custom prose yourself.
                </p>
                <details>
                  <summary>All scene choices</summary>
                  <dl>
                    {Object.entries(choices)
                      .filter(([k]) => k !== 'overrides')
                      .map(([k, v]) => (
                        <div key={k}>
                          <dt>{k}</dt>
                          <dd>{String(v)}</dd>
                        </div>
                      ))}
                  </dl>
                </details>
                <h3>Appearance changes</h3>
                <p>
                  Core facial structure, body proportions and signature imperfections are protected.
                  For a permanent change,{' '}
                  <Link className="text-link" href={`/characters/${selected?.id}/dna`}>
                    edit Character DNA
                  </Link>
                  , save a new version, then select it here.
                </p>
                {choices.overrides.map((o, i) => (
                  <div className="panel" key={i}>
                    <label className="field">
                      Appearance field
                      <select
                        aria-label="Appearance field"
                        value={o.field}
                        onChange={(e) =>
                          change({
                            ...choices,
                            overrides: choices.overrides.map((x, j) =>
                              j === i ? { ...x, field: e.target.value as typeof o.field } : x,
                            ),
                          })
                        }
                      >
                        {[
                          'hairStyle',
                          'hairColor',
                          'makeup',
                          'fashion',
                          'faceShape',
                          'bodyProportions',
                          'signatureImperfections',
                        ].map((f) => (
                          <option key={f} value={f}>
                            {overrideLabels[f as keyof typeof overrideLabels]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Requested appearance
                      <input
                        value={o.value}
                        maxLength={500}
                        onChange={(e) =>
                          change({
                            ...choices,
                            overrides: choices.overrides.map((x, j) =>
                              j === i ? { ...x, value: e.target.value } : x,
                            ),
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      Resolution
                      <select
                        aria-label="Resolution"
                        value={o.resolution}
                        onChange={(e) =>
                          change({
                            ...choices,
                            overrides: choices.overrides.map((x, j) =>
                              j === i
                                ? { ...x, resolution: e.target.value as typeof o.resolution }
                                : x,
                            ),
                          })
                        }
                      >
                        <option value="unresolved">Needs review</option>
                        <option value="canonical">Keep canonical appearance</option>
                        <option value="scene">Use for this scene only</option>
                        <option value="permanent">Permanent update in Character DNA</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      className="button"
                      onClick={() =>
                        change({
                          ...choices,
                          overrides: choices.overrides.filter((_, j) => j !== i),
                        })
                      }
                    >
                      Remove change
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="button"
                  disabled={choices.overrides.length >= 7}
                  onClick={() =>
                    change({
                      ...choices,
                      overrides: [
                        ...choices.overrides,
                        {
                          field: 'hairStyle',
                          value: 'Temporary hairstyle',
                          resolution: 'unresolved',
                        },
                      ],
                    })
                  }
                >
                  Add appearance change
                </button>
              </>
            )}
          </fieldset>
          {step === 4 && (
            <>
              <button
                type="button"
                disabled={pending || !characterVersionId}
                className="button primary"
                onClick={() => request('preview')}
              >
                Check continuity & prepare prompts
              </button>
              {preview && (
                <section aria-label="Prompt review">
                  <p className="badge">{preview.label}</p>
                  <h3>Continuity</h3>
                  {preview.findings.map((f, i) => (
                    <p key={i}>
                      <strong>
                        {f.status.toUpperCase()} ·{' '}
                        {overrideLabels[f.field as keyof typeof overrideLabels] ?? f.field}
                      </strong>{' '}
                      — {f.message}
                    </p>
                  ))}
                  {preview.ready ? (
                    <>
                      <h3>Positive prompt</h3>
                      <pre className="scene-prompt">{preview.positive}</pre>
                      <h3>Negative prompt</h3>
                      <pre className="scene-prompt">{preview.negative}</pre>
                      <button
                        className="button"
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              preview.positive + '\n\nNegative: ' + preview.negative,
                            );
                            setNotice('Prompts copied.');
                          } catch {
                            setError('Clipboard unavailable. Select and copy the prompt text.');
                          }
                        }}
                      >
                        Copy prompts
                      </button>
                    </>
                  ) : (
                    <p role="alert">
                      Resolve conflicts before preparing prompts or marking this scene ready.
                    </p>
                  )}
                </section>
              )}
            </>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
          <div className="wizard-actions">
            <div className="inline">
              <button
                type="button"
                className="button"
                disabled={step === 0 || pending}
                onClick={() => setStep(step - 1)}
              >
                Back
              </button>
              {step < 4 && (
                <button
                  type="button"
                  className="button primary"
                  disabled={pending}
                  onClick={() => setStep(step + 1)}
                >
                  Continue
                </button>
              )}
            </div>
            {!readOnly && (
              <div className="inline">
                <button
                  type="button"
                  className="button"
                  disabled={pending || !characterVersionId}
                  onClick={() => request('draft')}
                >
                  {pending ? 'Working…' : 'Save draft'}
                </button>
                {step === 4 && (
                  <button
                    type="button"
                    className="button primary"
                    disabled={pending || !preview?.ready}
                    onClick={() => request('ready')}
                  >
                    Save ready scene
                  </button>
                )}
                {saved && (
                  <button
                    type="button"
                    className="button"
                    disabled={pending || dirty}
                    onClick={() => request('duplicate')}
                  >
                    Duplicate scene
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
      {saved && (
        <section className="panel">
          <h2>Immutable scene history</h2>
          <p>
            Each save records exact choices, character reference and prepared prompts. Historical
            versions are read-only.
          </p>
          {saved.versions.map((v) => (
            <details key={v.versionNumber}>
              <summary>
                Scene version {v.versionNumber} · character version{' '}
                {characters.flatMap((c) => c.versions).find((c) => c.id === v.characterVersionId)
                  ?.versionNumber ?? 'saved'}
              </summary>
              <pre className="scene-prompt">
                {JSON.stringify({ choices: v.choices, prompt: v.prompt }, null, 2)}
              </pre>
            </details>
          ))}
        </section>
      )}
    </>
  );
}
