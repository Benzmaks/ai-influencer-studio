import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Sparkles, ArrowUpRight } from 'lucide-react';
const modules: Record<string, [string, string, string]> = {
  images: [
    'Images',
    'A new perspective, every time.',
    'Image generation, variations and editing with preserved originals.',
  ],
  videos: [
    'Videos',
    'Bring your world to life.',
    'Storyboards, image-to-video and capability-aware video tools.',
  ],
  content: [
    'Content',
    'Find your character’s voice.',
    'Captions, social concepts and an asset-connected calendar.',
  ],
  assets: [
    'Assets',
    'Everything, beautifully organized.',
    'Your private library of references, versions and creative work.',
  ],
  automations: [
    'Automations',
    'Let your ideas find their rhythm.',
    'Reusable workflows for generation, review and content.',
  ],
};
export default async function Module({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const item = modules[module];
  if (!item) notFound();
  return (
    <>
      <div className="eyebrow">THE CREATIVE TOOLKIT</div>
      <div className="page-heading">
        <div>
          <h1>{item[0]}</h1>
          <p>{item[1]}</p>
        </div>
        <span className="badge">Planned</span>
      </div>
      <section className="planned-panel">
        <div className="orb">
          <Sparkles size={34} />
        </div>
        <span className="eyebrow">COMING IN A LATER PHASE</span>
        <h2>A little more possibility.</h2>
        <p>{item[2]}</p>
        <p>
          This module is planned and is not functional yet. Start by creating your projects and
          characters.
        </p>
        <Link className="button primary" href="/characters">
          Explore characters <ArrowUpRight size={16} />
        </Link>
      </section>
    </>
  );
}
