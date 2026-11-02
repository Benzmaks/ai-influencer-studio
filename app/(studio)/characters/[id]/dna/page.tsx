import { notFound } from 'next/navigation';
import { workspace } from '@/lib/workspace';
import { getCharacter } from '@/features/characters/service';
import { defaultAnswers, readSnapshot, answersSchema } from '@/features/characters/dna';
import { CharacterWizard } from '@/components/character-wizard';
import { AppError } from '@/lib/errors';
export default async function EditDNA({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, project, canWrite } = await workspace();
  if (!project) notFound();
  const c = await getCharacter(user.id, project.id, id).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  const v = c.currentVersion;
  if (!v) notFound();
  const saved = readSnapshot(v.snapshot);
  const initial =
    saved?.answers ??
    answersSchema.parse({
      ...defaultAnswers(),
      name: v.name,
      displayName: v.displayName,
      age: v.age,
      location: v.location,
      occupation: v.occupation,
      bio: v.bio,
    });
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Refine the story.</h1>
          <p>Permanent changes create a new canonical version. Existing snapshots stay intact.</p>
        </div>
      </div>
      {canWrite && !c.archivedAt ? (
        <CharacterWizard
          key={`${project.id}:${c.id}:${c.revision}`}
          projectId={project.id}
          initialAnswers={initial}
          target={{ id: c.id, revision: c.revision }}
        />
      ) : (
        <section className="panel">
          <p>Editing requires an active character and editor or owner access.</p>
        </section>
      )}
    </>
  );
}
