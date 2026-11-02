'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function DuplicateCharacter({ projectId, id }: { projectId: string; id: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  return (
    <>
      <button
        className="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError('');
          try {
            const r = await fetch(`/api/projects/${projectId}/characters/${id}/duplicate`, {
              method: 'POST',
            });
            const result = await r.json();
            if (!r.ok) throw new Error(result.error);
            router.push(`/characters/${result.id}`);
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not duplicate character.');
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? 'Duplicating…' : 'Duplicate character'}
      </button>
      {error && (
        <span role="alert" className="alert">
          {error}
        </span>
      )}
    </>
  );
}
