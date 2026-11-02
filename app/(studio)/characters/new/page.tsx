import Link from 'next/link';
import { workspace } from '@/lib/workspace';
import { CharacterForm } from '@/components/character-form';
export default async function NewCharacter() {
  const { project, canWrite } = await workspace();
  return (
    <>
      <Link className="text-link" href="/characters">
        ← Characters
      </Link>
      <div className="page-heading">
        <div>
          <h1>A character of your own.</h1>
          <p>Start with the essentials. Every edit keeps a version of the story.</p>
        </div>
        <span className="badge">Identity foundation</span>
      </div>
      <section className="panel">
        {project && canWrite ? (
          <CharacterForm projectId={project.id} />
        ) : (
          <p>
            Create/select a project with editor or owner access first.{' '}
            <Link href="/projects">Manage projects →</Link>
          </p>
        )}
      </section>
    </>
  );
}
