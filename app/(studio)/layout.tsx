import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';
import { StudioShell } from '@/components/studio-shell';
import { ProjectPicker } from '@/components/project-picker';
import { workspace } from '@/lib/workspace';
export const dynamic = 'force-dynamic';
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  let context: Awaited<ReturnType<typeof workspace>> | undefined;
  try {
    context = await workspace();
  } catch (error) {
    unstable_rethrow(error);
  }
  if (!context)
    return (
      <StudioShell>
        <section className="panel">
          <span className="badge">Infrastructure needs attention</span>
          <h1>Let’s reconnect your workspace.</h1>
          <p>
            Start PostgreSQL, check DATABASE_URL and run npm run db:migrate. Follow
            docs/development.md, then reload this page. Saved work has not been replaced with demo
            data.
          </p>
          <Link className="button primary" href="/dashboard">
            Try again
          </Link>
        </section>
      </StudioShell>
    );
  return (
    <StudioShell
      header={<ProjectPicker projects={context.projects} selected={context.project?.id} />}
    >
      {children}
    </StudioShell>
  );
}
