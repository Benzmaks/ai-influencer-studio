'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function MemberControls({
  projectId,
  userId,
  role,
}: {
  projectId: string;
  userId: string;
  role: string;
}) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function change(next: string | null) {
    setPending(true);
    setError('');
    try {
      const response = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: next ? 'PATCH' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: next ? JSON.stringify({ role: next }) : undefined,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Member update failed.');
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="stack">
      <div className="inline">
        <label className="field">
          Role
          <select value={role} disabled={pending} onChange={(e) => change(e.target.value)}>
            <option value="OWNER">Owner</option>
            <option value="EDITOR">Editor</option>
            <option value="VIEWER">Viewer</option>
          </select>
        </label>
        <button
          disabled={pending}
          className="button small danger"
          onClick={() => {
            if (confirm('Remove this member from the project?')) change(null);
          }}
        >
          Remove
        </button>
      </div>
      {error && (
        <div role="alert" className="alert">
          {error}
        </div>
      )}
    </div>
  );
}
