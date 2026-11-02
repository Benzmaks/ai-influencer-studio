import Link from 'next/link';
import { Plus } from 'lucide-react';
import { workspace } from '@/lib/workspace';
import { listCharacters } from '@/features/characters/service';
import { CharacterCard } from '@/components/character-card';
export default async function Characters() {
  const { user, project, canWrite } = await workspace();
  const characters = project ? await listCharacters(user.id, project.id) : [];
  return (
    <>
      <span className="eyebrow">PERSONALITIES WITH POSSIBILITY</span>
      <div className="page-heading">
        <div>
          <h1>Characters</h1>
          <p>Your fictional talent, each with a story of their own.</p>
        </div>
        {project && canWrite && (
          <Link className="button primary" href="/characters/new">
            <Plus size={16} /> Create character
          </Link>
        )}
      </div>
      {characters.length ? (
        <>
          <div className="section-title">
            <h2>Character library</h2>
            <span className="badge">{characters.length} profiles · including archived</span>
          </div>
          <div className="grid">
            {characters.map((c) => (
              <CharacterCard key={c.id} character={c} />
            ))}
          </div>
        </>
      ) : (
        <section className="panel empty">
          <h2>Your story starts here.</h2>
          <p>
            {project
              ? 'No characters yet. Create a profile with a name, location and a little background.'
              : 'Choose or create a project before creating characters.'}
          </p>
          <Link
            href={project && canWrite ? '/characters/new' : '/projects'}
            className="button primary"
          >
            {project && canWrite ? 'Create your first character' : 'Manage projects'}
          </Link>
        </section>
      )}
    </>
  );
}
