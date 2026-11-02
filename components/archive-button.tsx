'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function ArchiveButton({
  projectId,
  id,
  revision,
}: {
  projectId: string;
  id: string;
  revision: number;
}) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const router = useRouter();
  return (
    <>
      <button
        className="button danger"
        disabled={pending}
        onClick={async () => {
          if (!confirm('Archive this character? Its versions will be preserved.')) return;
          setPending(true);
          try {
            const response = await fetch(`/api/projects/${projectId}/characters/${id}`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ revision }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to archive.');
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? 'Archiving…' : 'Archive character'}
      </button>
      {error && (
        <span role="alert" className="alert">
          {error}
        </span>
      )}
    </>
  );
}
