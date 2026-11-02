import Link from 'next/link';
import { notFound } from 'next/navigation';
import { workspace } from '@/lib/workspace';
import { CharacterForm } from '@/components/character-form';
import { CharacterWizard } from '@/components/character-wizard';
import { answersSchema, defaultAnswers } from '@/features/characters/dna';
import { getDraft } from '@/features/characters/drafts';
import { AppError } from '@/lib/errors';
export default async function NewCharacter({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string; mode?: string }>;
}) {
  const { user, project, canWrite } = await workspace();
  const { draft: id, mode } = await searchParams;
  const draft =
    id && project
      ? await getDraft(user.id, project.id, id).catch((e) => {
          if (e instanceof AppError && e.status === 404) notFound();
          throw e;
        })
      : null;
  return (
    <>
      <Link className="text-link" href="/characters">
        ← Characters
      </Link>
      <div className="page-heading">
        <div>
          <h1>{draft?.characterId ? 'Refine your character.' : 'A character of your own.'}</h1>
          <p>Choose the details. Build a personality. Keep every version of the story.</p>
        </div>
        <div className="inline">
          <span className="badge">Character DNA creator</span>
          <Link
            href={mode === 'basic' ? '/characters/new' : '/characters/new?mode=basic'}
            className="text-link"
          >
            {mode === 'basic' ? 'Full character creator' : 'Quick identity form'}
          </Link>
        </div>
      </div>
      {project && canWrite ? (
        mode === 'basic' ? (
          <section className="panel">
            <CharacterForm projectId={project.id} />
          </section>
        ) : (
          <CharacterWizard
            key={`${project.id}:${draft?.id ?? 'new'}`}
            projectId={project.id}
            initialAnswers={draft ? answersSchema.parse(draft.answers) : defaultAnswers()}
            initialStep={draft?.step ?? 0}
            initialDraft={draft ? { id: draft.id, revision: draft.revision } : undefined}
            target={
              draft?.characterId
                ? { id: draft.characterId, revision: draft.baseRevision! }
                : undefined
            }
          />
        )
      ) : (
        <section className="panel">
          <h2>First, give your character a home.</h2>
          <p>
            {project
              ? 'Creating requires editor or owner access.'
              : 'Create a project before starting your character.'}
          </p>
          <Link className="button primary" href="/projects">
            Create or select a project
          </Link>
        </section>
      )}
    </>
  );
}
