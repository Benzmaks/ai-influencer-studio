import { listDrafts } from '@/features/characters/drafts';
import { answersSchema } from '@/features/characters/dna';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { workspace } from '@/lib/workspace';
import { listCharacters } from '@/features/characters/service';
import { CharacterCard } from '@/components/character-card';
export default async function Characters() {
  const { user, project, canWrite } = await workspace();
  const characters = project ? await listCharacters(user.id, project.id) : [];
  const drafts = project ? await listDrafts(user.id, project.id) : [];
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
      {drafts.length > 0 && (
        <>
          <div className="section-title">
            <h2>Your unfinished characters</h2>
            <span className="badge">Private drafts</span>
          </div>
          <div className="grid">
            {drafts.map((d) => {
              const a = answersSchema.parse(d.answers);
              return (
                <Link
                  key={d.id}
                  href={`/characters/new?draft=${d.id}`}
                  className="panel draft-card"
                >
                  <span className="eyebrow">STEP {d.step + 1} OF 10</span>
                  <h3>{a.displayName || a.name || 'Untitled character'}</h3>
                  <p>{d.characterId ? 'Unsaved character update' : 'A new story in progress'}</p>
                  <span className="text-link">Resume draft →</span>
                </Link>
              );
            })}
          </div>
        </>
      )}
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
