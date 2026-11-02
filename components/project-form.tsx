'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function ProjectForm() {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const router = useRouter();
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setPending(true);
        setError('');
        try {
          const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: new FormData(form).get('name') }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          form.reset();
          router.refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Unable to create project.');
        } finally {
          setPending(false);
        }
      }}
    >
      <label className="field">
        Project name
        <input
          name="name"
          placeholder="e.g. The everyday editorial"
          minLength={2}
          maxLength={80}
          required
        />
      </label>
      {error && (
        <div role="alert" className="alert">
          {error}
        </div>
      )}
      <button className="button primary" disabled={pending}>
        {pending ? 'Creating…' : 'Create project'}
      </button>
    </form>
  );
}
