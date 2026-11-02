'use client';
import { useState } from 'react';
import type { CharacterSnapshot } from '@/features/characters/dna';
const documents = [
  ['characterDNA', 'Character DNA'],
  ['visualBible', 'Visual Bible'],
  ['brandDNA', 'Brand DNA'],
  ['realismDNA', 'Realism DNA'],
  ['socialVoice', 'Social Voice'],
  ['contentPillars', 'Content pillars'],
  ['imageProfile', 'Image profile'],
] as const;
const preferredOrder = [
  'identity',
  'positioning',
  'personality',
  'appearance',
  'interests',
  'lifestyle',
  'attributeStability',
  'canonicalFace',
  'canonicalHair',
  'canonicalBody',
  'canonicalSkin',
  'signatureFeatures',
  'signatureImperfections',
  'realismLevel',
  'makeup',
  'fashionIdentity',
  'jewelryAndAccessories',
  'colorPalette',
  'photographyStyle',
  'preferredLenses',
  'preferredLighting',
  'preferredCompositions',
];
function title(key: string) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}
function Values({ value }: { value: unknown }) {
  if (Array.isArray(value))
    return value.length ? (
      <div className="profile-chips">
        {value.map((v, i) => (
          <span key={i} className="badge">
            {String(v)}
          </span>
        ))}
      </div>
    ) : (
      <span className="muted">None selected</span>
    );
  if (value && typeof value === 'object')
    return (
      <dl className="profile-values">
        {Object.entries(value)
          .sort(([a], [b]) => {
            const rank = (k: string) => {
              const i = preferredOrder.indexOf(k);
              return i < 0 ? 999 : i;
            };
            return rank(a) - rank(b);
          })
          .map(([k, v]) => (
            <div key={k}>
              <dt>{title(k)}</dt>
              <dd>
                <Values value={v} />
              </dd>
            </div>
          ))}
      </dl>
    );
  return <span>{String(value ?? 'Not defined')}</span>;
}
export function CharacterProfile({ snapshot }: { snapshot: CharacterSnapshot }) {
  const [active, setActive] = useState<(typeof documents)[number][0]>('characterDNA');
  return (
    <section className="dna-profile">
      <div className="section-title">
        <h2>Your character, defined.</h2>
        <span className="badge">Mock profile · template</span>
      </div>
      <p className="muted">
        Structured from your choices using a deterministic mock provider. No real AI images or
        profiles have been generated.
      </p>
      <div className="profile-tabs" aria-label="Profile documents">
        {documents.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={active === key ? 'profile-tab active' : 'profile-tab'}
            aria-pressed={active === key}
            onClick={() => setActive(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="profile-document">
        <h3>{documents.find(([key]) => key === active)?.[1]}</h3>
        <Values value={snapshot.profile[active]} />
      </div>
    </section>
  );
}
