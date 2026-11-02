import { readSnapshot } from '@/features/characters/dna';
import { CharacterProfile } from '@/components/character-profile';
import { DuplicateCharacter } from '@/components/duplicate-character';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { workspace } from '@/lib/workspace';
import { getCharacter } from '@/features/characters/service';
import { AppError } from '@/lib/errors';
import { ArchiveButton } from '@/components/archive-button';
export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, project, canWrite } = await workspace();
  if (!project) notFound();
  const character = await getCharacter(user.id, project.id, id).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  const v = character.currentVersion;
  if (!v) notFound();
  const dna = readSnapshot(v.snapshot);
  return (
    <>
      <Link href="/characters" className="text-link">
        ← Character library
      </Link>
      <div className="page-heading">
        <div>
          <h1>{v.displayName}</h1>
          <p>Character identity · {project.name}</p>
        </div>
        <div className="inline">
          {canWrite && <DuplicateCharacter projectId={project.id} id={id} />}
          {character.archivedAt ? (
            <span className="badge">Archived</span>
          ) : (
            canWrite && (
              <>
                <Link href={`/characters/${id}/${dna ? 'dna' : 'edit'}`} className="button primary">
                  Edit character
                </Link>
                <ArchiveButton projectId={project.id} id={id} revision={character.revision} />
              </>
            )
          )}
        </div>
      </div>
      <div className="character-banner">
        <span className="initial" aria-hidden="true">
          {v.displayName.slice(0, 1)}
        </span>
        <div>
          <span className="eyebrow">CANONICAL IDENTITY</span>
          <h2>{v.name}</h2>
          <span className="badge">Version {v.versionNumber} · Saved profile</span>
        </div>
      </div>
      <div className="two-column">
        <section className="panel">
          <h2>The essentials</h2>
          <dl className="definition">
            {[
              ['Age', v.age],
              ['Location', v.location || 'Not defined'],
              ['Occupation', v.occupation || 'Not defined'],
              ['Display name', v.displayName],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <h3>Background</h3>
          <p className="version-summary">{v.bio || 'No background added yet.'}</p>
          {!dna && !character.archivedAt && canWrite && (
            <Link href={`/characters/${id}/dna`} className="button primary">
              Build Character DNA
            </Link>
          )}
          {dna && <span className="badge">Canonical DNA · Version {v.versionNumber}</span>}
        </section>
        <section className="panel">
          <h2>Version history</h2>
          <p>Every saved identity stays intact.</p>
          <ol className="history">
            {character.versions.map((version) => (
              <li key={version.id}>
                <details open={version.id === character.currentVersionId}>
                  <summary>
                    <strong>
                      Version {version.versionNumber}
                      {version.id === character.currentVersionId ? ' · Current' : ''}
                    </strong>
                    <span>
                      {version.createdAt.toISOString().slice(0, 16).replace('T', ' ')} UTC
                    </span>
                  </summary>
                  <p>
                    {version.name} · {version.age} · {version.location}
                  </p>
                  <p>{version.occupation}</p>
                  <p className="version-summary">{version.bio || 'No background'}</p>
                  {version.id !== character.currentVersionId && readSnapshot(version.snapshot) && (
                    <details>
                      <summary>View historical profile</summary>
                      <CharacterProfile snapshot={readSnapshot(version.snapshot)!} />
                    </details>
                  )}
                </details>
              </li>
            ))}
          </ol>
        </section>
      </div>
      {dna && (
        <section className="panel" style={{ marginTop: 24 }}>
          <CharacterProfile snapshot={dna} />
        </section>
      )}
    </>
  );
}
