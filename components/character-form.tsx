'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
type Identity = {
  name: string;
  displayName: string;
  age: number;
  location: string;
  occupation: string;
  bio: string;
};
export function CharacterForm({
  projectId,
  character,
}: {
  projectId: string;
  character?: Identity & { id: string; revision: number };
}) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const router = useRouter();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError('');
        const data = Object.fromEntries(new FormData(e.currentTarget));
        try {
          const response = await fetch(
            `/api/projects/${projectId}/characters${character ? `/${character.id}` : ''}`,
            {
              method: character ? 'PATCH' : 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...data,
                age: Number(data.age),
                revision: character?.revision,
              }),
            },
          );
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          router.push(`/characters/${result.id}`);
          router.refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Unable to save character.');
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="form-grid">
        <label className="field">
          Character name
          <input
            name="name"
            defaultValue={character?.name}
            minLength={2}
            maxLength={80}
            required
            placeholder="e.g. Sofia Laurent"
          />
        </label>
        <label className="field">
          Display name
          <input
            name="displayName"
            defaultValue={character?.displayName}
            minLength={2}
            maxLength={80}
            required
            placeholder="e.g. Sofia"
          />
        </label>
        <label className="field">
          Age
          <input
            name="age"
            type="number"
            defaultValue={character?.age ?? 25}
            min={18}
            max={120}
            required
          />
        </label>
        <label className="field">
          Location
          <input
            name="location"
            defaultValue={character?.location}
            maxLength={120}
            placeholder="e.g. London, UK"
          />
        </label>
        <label className="field full">
          Occupation / creative niche
          <input
            name="occupation"
            defaultValue={character?.occupation}
            maxLength={120}
            placeholder="e.g. Fashion storyteller & city explorer"
          />
        </label>
        <div className="field full">
          <label htmlFor="character-bio">Background</label>
          <textarea
            id="character-bio"
            name="bio"
            defaultValue={character?.bio}
            maxLength={2000}
            placeholder="A little about their world, personality and ambitions…"
          />
        </div>
      </div>
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      <div className="form-actions">
        <button className="button primary" disabled={pending}>
          {pending ? 'Saving…' : character ? 'Save new version' : 'Create character'}
        </button>
        <Link className="button" href={character ? `/characters/${character.id}` : '/characters'}>
          Cancel
        </Link>
        <span className="muted">
          {character
            ? 'Earlier versions stay unchanged.'
            : 'Basic identity · Full DNA wizard planned for Phase 2.'}
        </span>
      </div>
    </form>
  );
}
