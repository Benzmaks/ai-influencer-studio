import Link from 'next/link';
export function CharacterCard({
  character,
}: {
  character: {
    id: string;
    name: string;
    revision: number;
    archivedAt: Date | null;
    currentVersion: {
      versionNumber: number;
      displayName: string;
      occupation: string;
      location: string;
    } | null;
  };
}) {
  return (
    <Link href={`/characters/${character.id}`} className="character-card">
      <div className="character-art">
        <span className="badge">{character.archivedAt ? 'Archived' : 'Character profile'}</span>
        <span className="monogram" aria-hidden="true">
          {character.name.slice(0, 2).toUpperCase()}
        </span>
      </div>
      <div className="character-body">
        <h3>{character.currentVersion?.displayName ?? character.name}</h3>
        <p>{character.currentVersion?.occupation || 'A story waiting to unfold'}</p>
        <div className="card-bottom">
          <span>{character.currentVersion?.location || 'Location undefined'}</span>
          <span>VERSION {character.currentVersion?.versionNumber ?? character.revision} ↗</span>
        </div>
      </div>
    </Link>
  );
}
