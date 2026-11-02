'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { signOut } from 'next-auth/react';
export function ProjectPicker({
  projects,
  selected,
}: {
  projects: { id: string; name: string }[];
  selected?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  return (
    <>
      <div className="project-picker">
        <label className="sr-only" htmlFor="project-picker">
          Active project
        </label>
        <select
          id="project-picker"
          className="project-select"
          value={selected ?? ''}
          onChange={async (e) => {
            setError('');
            try {
              const res = await fetch('/api/projects/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: e.target.value }),
              });
              if (!res.ok) throw new Error();
              router.refresh();
            } catch {
              setError('Could not switch project.');
            }
          }}
        >
          {!projects.length && <option value="">No projects yet</option>}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {error && <span role="alert">{error}</span>}
      </div>
      <Link href="/projects" className="text-link">
        Projects
      </Link>
      <button className="button small" onClick={() => signOut({ callbackUrl: '/login' })}>
        Sign out
      </button>
    </>
  );
}
