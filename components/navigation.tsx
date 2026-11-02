'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UsersRound,
  Clapperboard,
  ImageIcon,
  Film,
  CalendarDays,
  FolderOpen,
  Workflow,
  Settings2,
  Sparkles,
} from 'lucide-react';
export const navigation = [
  ['Dashboard', '/dashboard', LayoutDashboard],
  ['Characters', '/characters', UsersRound],
  ['Scenes', '/scenes', Clapperboard],
  ['Images', '/images', ImageIcon],
  ['Videos', '/videos', Film],
  ['Content', '/content', CalendarDays],
  ['Assets', '/assets', FolderOpen],
  ['Automations', '/automations', Workflow],
  ['Settings', '/settings', Settings2],
] as const;
export function Navigation() {
  const pathname = usePathname();
  return (
    <>
      <Link className="brand" href="/dashboard">
        <span className="brand-icon">
          <Sparkles size={22} />
        </span>
        <span>
          Influencer<span className="brand-sub">STUDIO</span>
        </span>
      </Link>
      <p className="nav-label">WORKSPACE</p>
      <nav aria-label="Main navigation">
        {navigation.map(([label, href, Icon]) => (
          <Link
            aria-current={pathname.startsWith(href) ? 'page' : undefined}
            key={href}
            href={href}
          >
            <Icon size={19} />
            <span>{label}</span>
            {['Videos', 'Content', 'Automations'].includes(label) && (
              <span className="nav-dot" aria-label="Planned" />
            )}
          </Link>
        ))}
      </nav>
      <div className="sidebar-note">
        <Sparkles size={19} />
        <strong>Room for your imagination.</strong>
        <p>Build a character. Give your ideas a point of view.</p>
        <span className="badge">Mock providers · No AI costs</span>
      </div>
    </>
  );
}
