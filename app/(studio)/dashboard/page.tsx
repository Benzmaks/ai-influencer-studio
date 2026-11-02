import Link from 'next/link';
import { Plus, ArrowUpRight, UsersRound } from 'lucide-react';
import { workspace } from '@/lib/workspace';
import { listCharacters } from '@/features/characters/service';
import { CharacterCard } from '@/components/character-card';
export default async function Dashboard() {
  const { user, project, projects, canWrite } = await workspace();
  const characters = project ? await listCharacters(user.id, project.id) : [];
  const active = characters.filter((c) => !c.archivedAt);
  return (
    <>
      <div className="eyebrow">A FRESH PAGE, A NEW POSSIBILITY</div>
      <div className="page-heading">
        <div>
          <h1>Your creative studio.</h1>
          <p>Good ideas deserve a world of their own. Let’s build yours.</p>
        </div>
        {project && canWrite ? (
          <Link className="button primary" href="/characters/new">
            <Plus size={16} /> Create character
          </Link>
        ) : (
          <Link className="button primary" href="/projects">
            Manage projects <ArrowUpRight size={16} />
          </Link>
        )}
      </div>
      <section className="hero">
        <span className="eyebrow">FROM AN IDEA TO AN IDENTITY</span>
        <h2>
          Meet your next
          <br />
          main character.
        </h2>
        <p>
          Give a fictional personality a name, a story and a place in your world. The rest starts
          here.
        </p>
        <Link className="button primary" href={project ? '/characters' : '/projects'}>
          {project ? 'Explore your characters' : 'Create your first project'}{' '}
          <ArrowUpRight size={16} />
        </Link>
        <div className="hero-art" aria-label="Decorative illustration, not a generated character">
          <span>STUDIO ILLUSTRATION</span>
        </div>
      </section>
      <div className="stat-grid">
        <div className="stat">
          <span>YOUR PROJECTS</span>
          <strong>{projects.length.toString().padStart(2, '0')}</strong>
        </div>
        <div className="stat">
          <span>ACTIVE CHARACTERS</span>
          <strong>{active.length.toString().padStart(2, '0')}</strong>
        </div>
        <div className="stat">
          <span>ARCHIVED PROFILES</span>
          <strong>
            {characters
              .filter((c) => c.archivedAt)
              .length.toString()
              .padStart(2, '0')}
          </strong>
        </div>
      </div>
      <div className="section-title">
        <h2>Your cast of characters</h2>
        <Link href="/characters" className="text-link">
          View all ↗
        </Link>
      </div>
      {active.length ? (
        <div className="grid">
          {active.slice(0, 3).map((c) => (
            <CharacterCard key={c.id} character={c} />
          ))}
        </div>
      ) : (
        <section className="panel empty">
          <UsersRound size={30} />
          <h2>A world of possibility.</h2>
          <p>
            {project
              ? 'Your project is ready for its first character. Start with the essentials and shape the story over time.'
              : 'Create a project to keep your characters and future creative work together.'}
          </p>
          <Link className="button" href={project ? '/characters/new' : '/projects'}>
            {project ? 'Create your first character' : 'Create a project'} <Plus size={15} />
          </Link>
        </section>
      )}
      <div className="section-title">
        <h2>On the horizon</h2>
        <span className="badge">Planned</span>
      </div>
      <div className="grid">
        {[
          ['Scene builder', 'Set the mood, frame the moment.', '/scenes'],
          ['Image studio', 'Explore new creative perspectives.', '/images'],
          ['Content studio', 'Give your character a voice.', '/content'],
        ].map(([name, desc, href]) => (
          <Link className="panel" href={href} key={href}>
            <span className="eyebrow">PLANNED MODULE</span>
            <h3>{name} ↗</h3>
            <p>{desc}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
