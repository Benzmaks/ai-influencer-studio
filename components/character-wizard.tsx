'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ZodError } from 'zod';
import { Check, ChevronLeft, ChevronRight, Save, Sparkles } from 'lucide-react';
import {
  completeAnswersSchema,
  defaultAnswers,
  realismLevels,
  stability,
  type CharacterAnswers,
  type CharacterSnapshot,
} from '@/features/characters/dna';
import { wizardSteps, type Field } from '@/features/characters/wizard-fields';
import { CharacterProfile } from './character-profile';
type Draft = { id: string; revision: number };
function FieldControl({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: CharacterAnswers[keyof CharacterAnswers];
  onChange: (value: string | string[] | number) => void;
}) {
  const [custom, setCustom] = useState('');
  const selected = Array.isArray(value) ? value : [];
  const id = `dna-${field.key}`;
  return (
    <fieldset
      className={
        field.options || field.multiple || field.long ? 'wizard-field full' : 'wizard-field'
      }
    >
      <legend>{field.label}</legend>
      {field.options && (
        <div className="choice-grid">
          {field.options.map((option) => {
            const checked = field.multiple ? selected.includes(option) : value === option;
            return (
              <button
                type="button"
                key={option}
                className={checked ? 'choice-card selected' : 'choice-card'}
                aria-pressed={checked}
                onClick={() =>
                  onChange(
                    field.multiple
                      ? checked
                        ? selected.filter((x) => x !== option)
                        : [...selected, option]
                      : option,
                  )
                }
              >
                {option}
                {checked && <Check size={14} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
      {field.multiple ? (
        <>
          <div className="profile-chips">
            {selected.map((item) => (
              <button
                className="badge"
                type="button"
                key={item}
                onClick={() => onChange(selected.filter((x) => x !== item))}
                aria-label={`Remove ${item}`}
              >
                {item} ×
              </button>
            ))}
          </div>
          <label className="field" htmlFor={id}>
            Add a custom {field.label.toLowerCase()}
            <div className="inline">
              <input
                aria-label={`Custom ${field.label.toLowerCase()}`}
                id={id}
                value={custom}
                maxLength={120}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (custom.trim() && !selected.includes(custom.trim()))
                      onChange([...selected, custom.trim()]);
                    setCustom('');
                  }
                }}
              />
              <button
                className="button small"
                type="button"
                disabled={!custom.trim() || selected.length >= 20}
                onClick={() => {
                  if (custom.trim() && !selected.includes(custom.trim()))
                    onChange([...selected, custom.trim()]);
                  setCustom('');
                }}
              >
                Add
              </button>
            </div>
          </label>
        </>
      ) : (
        <label className="field" htmlFor={id}>
          {field.options ? (
            'Selected value or custom answer'
          ) : (
            <span className="sr-only">{field.label}</span>
          )}
          {field.long ? (
            <textarea
              aria-label={field.label}
              id={id}
              value={String(value)}
              maxLength={2000}
              onChange={(e) => onChange(e.target.value)}
            />
          ) : (
            <input
              id={id}
              aria-label={field.label}
              type={field.number ? 'number' : 'text'}
              min={field.number ? 18 : undefined}
              max={field.number ? 120 : undefined}
              maxLength={['name', 'displayName'].includes(field.key) ? 80 : 500}
              value={value as string | number}
              onChange={(e) => onChange(field.number ? Number(e.target.value) : e.target.value)}
            />
          )}
        </label>
      )}
    </fieldset>
  );
}
export function CharacterWizard({
  projectId,
  initialAnswers = defaultAnswers(),
  initialStep = 0,
  initialDraft,
  target,
}: {
  projectId: string;
  initialAnswers?: CharacterAnswers;
  initialStep?: number;
  initialDraft?: Draft;
  target?: { id: string; revision: number };
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState(initialAnswers);
  const [step, setStep] = useState(initialStep);
  const [draft, setDraft] = useState(initialDraft);
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(!initialDraft);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState<CharacterSnapshot | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (initialStep === 9) {
      let active = true;
      fetch(`/api/projects/${projectId}/character-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initialAnswers),
      })
        .then(async (r) => {
          const data = await r.json();
          if (!r.ok) throw new Error(data.error);
          if (active) setSnapshot(data);
        })
        .catch((e) => {
          if (active) setError(e instanceof Error ? e.message : 'Could not build preview.');
        });
      return () => {
        active = false;
      };
    }
  }, [initialStep, initialAnswers, projectId]);
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  async function request(path: string, body: unknown, method = 'POST') {
    const r = await fetch(`/api/projects/${projectId}/${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }
  async function persist(nextStep: number) {
    const saved: Draft = await request(
      `drafts${draft ? `/${draft.id}` : ''}`,
      {
        answers,
        step: nextStep,
        revision: draft?.revision,
        characterId: target?.id,
        baseRevision: target?.revision,
      },
      draft ? 'PATCH' : 'POST',
    );
    setDraft(saved);
    setDirty(false);
    window.history.replaceState(null, '', `/characters/new?draft=${saved.id}`);
    return saved;
  }
  async function go(next: number) {
    setError('');
    setPending(true);
    if (next === 9) setSnapshot(null);
    try {
      if (next > 0) completeAnswersSchema.parse(answers);
      await persist(next);
      setStep(next);
      if (next === 9) setSnapshot(await request('character-preview', answers));
      heading.current?.focus();
    } catch (e) {
      setError(
        e instanceof ZodError
          ? e.issues.map((i) => i.message).join(' ')
          : e instanceof Error
            ? e.message
            : 'Could not save your draft.',
      );
    } finally {
      setPending(false);
    }
  }
  async function saveClose() {
    setPending(true);
    setError('');
    try {
      await persist(step);
      router.push('/characters');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setPending(false);
    }
  }
  async function publish() {
    setPending(true);
    setError('');
    try {
      completeAnswersSchema.parse(answers);
      const saved = await persist(9);
      const result = await request(`drafts/${saved.id}/publish`, { revision: saved.revision });
      setDirty(false);
      router.push(`/characters/${result.id}`);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof ZodError
          ? e.issues.map((i) => i.message).join(' ')
          : e instanceof Error
            ? e.message
            : 'Could not save character.',
      );
    } finally {
      setPending(false);
    }
  }
  async function discard() {
    if (!confirm('Discard this draft? Saved characters and their history will stay unchanged.'))
      return;
    setPending(true);
    try {
      if (draft) await request(`drafts/${draft.id}`, { revision: draft.revision }, 'DELETE');
      setDirty(false);
      router.push('/characters');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not discard draft.');
      setPending(false);
    }
  }
  const current = wizardSteps[step];
  return (
    <div className="wizard">
      <aside className="wizard-steps">
        <span className="eyebrow">CHARACTER CREATOR</span>
        <ol>
          {wizardSteps.map((s, i) => (
            <li key={s.title}>
              <button
                disabled={pending}
                type="button"
                className={i === step ? 'active' : ''}
                aria-current={i === step ? 'step' : undefined}
                onClick={() => go(i)}
              >
                <span>{i < step ? <Check size={13} /> : i + 1}</span>
                {s.title}
              </button>
            </li>
          ))}
        </ol>
        <p>
          {dirty ? 'Unsaved choices' : 'Draft saved privately'}
          <br />
          Save & close to return later.
        </p>
      </aside>
      <section className="panel wizard-content">
        <div className="wizard-top">
          <span className="eyebrow">STEP {step + 1} OF 10</span>
          <span className="badge">
            {target ? 'New immutable version' : 'Fictional adult character'}
          </span>
        </div>
        <progress aria-label="Character creator progress" max={10} value={step + 1} />
        <h2 ref={heading} tabIndex={-1}>
          {current.title}
        </h2>
        <p>{current.subtitle}</p>
        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}
        {step === 6 && (
          <p>
            Signature imperfections are persistent identity anchors. “None” in a general control
            means no additional marks beyond those anchors.
          </p>
        )}
        <div className="form-grid">
          {current.fields.map((field) => (
            <FieldControl
              key={field.key}
              field={field}
              value={answers[field.key]}
              onChange={(value) => {
                setAnswers((previous) => ({ ...previous, [field.key]: value }));
                setDirty(true);
                setSnapshot(null);
              }}
            />
          ))}
        </div>
        {step === 5 && (
          <>
            <div className="realism-grid">
              {realismLevels.map((label, i) => (
                <button
                  type="button"
                  key={label}
                  className={
                    answers.realismLevel === i + 1 ? 'realism-card selected' : 'realism-card'
                  }
                  aria-pressed={answers.realismLevel === i + 1}
                  onClick={() => {
                    setAnswers((a) => ({ ...a, realismLevel: i + 1 }));
                    setDirty(true);
                    setSnapshot(null);
                  }}
                >
                  <span className="realism-number">0{i + 1}</span>
                  <strong>{label}</strong>
                  <span>
                    {
                      [
                        'Refined, intentional and editorial.',
                        'A polished finish with believable detail.',
                        'Natural texture and everyday presence.',
                        'Spontaneous detail and relaxed framing.',
                        'Observed texture and honest photographic detail.',
                      ][i]
                    }
                  </span>
                </button>
              ))}
            </div>
            <p>
              Realism changes the finish. It never invents signature imperfections or replaces your
              character’s identity anchors.
            </p>
          </>
        )}
        {step === 9 && (
          <>
            <div className="review-identity">
              <span className="avatar">{answers.displayName.slice(0, 2).toUpperCase()}</span>
              <div>
                <h3>{answers.displayName}</h3>
                <p>
                  {answers.age} · {answers.nationality || 'Nationality not set'} ·{' '}
                  {answers.location || 'Location not set'}
                </p>
              </div>
            </div>
            {snapshot ? (
              <CharacterProfile snapshot={snapshot} />
            ) : (
              <p>Build the mock profile to review all seven documents before saving.</p>
            )}
            <button
              disabled={pending}
              type="button"
              className="button"
              onClick={async () => {
                setPending(true);
                setError('');
                try {
                  setSnapshot(await request('character-preview', answers));
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Preview failed.');
                } finally {
                  setPending(false);
                }
              }}
            >
              <Sparkles size={15} /> Rebuild mock profile
            </button>
            <div className="stability-grid">
              {Object.entries(stability).map(([key, items]) => (
                <section key={key}>
                  <h3>
                    {key === 'core'
                      ? 'Core identity'
                      : key === 'semiPermanent'
                        ? 'Semi-permanent'
                        : 'Scene-variable'}
                  </h3>
                  <ul>
                    {items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <p>
              Saving establishes a canonical version. Every permanent edit creates a new version;
              earlier profiles and signature imperfections remain in their original snapshots.
            </p>
          </>
        )}
        <div className="wizard-actions">
          <div className="inline">
            <button
              type="button"
              disabled={pending || step === 0}
              className="button"
              onClick={() => go(step - 1)}
            >
              <ChevronLeft size={15} /> Back
            </button>
            {step < 9 ? (
              <button
                type="button"
                disabled={pending}
                className="button primary"
                onClick={() => go(step + 1)}
              >
                {pending ? 'Saving…' : 'Continue'}
                <ChevronRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                disabled={pending || !snapshot}
                className="button primary"
                onClick={publish}
              >
                {pending ? 'Saving…' : target ? 'Save new character version' : 'Save character'}
              </button>
            )}
          </div>
          <button type="button" disabled={pending} className="button" onClick={saveClose}>
            <Save size={14} /> Save & close
          </button>
          <button type="button" disabled={pending} className="text-button" onClick={discard}>
            Discard draft
          </button>
        </div>
      </section>
    </div>
  );
}
