import { Navigation } from './navigation';
export function StudioShell({
  children,
  header,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
}) {
  return (
    <div className="studio">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Navigation />
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="topbar-label">YOUR CREATIVE WORKSPACE</span>
          <div className="topbar-actions">
            {header}
            <span className="badge">
              <span className="status-dot" /> Mock mode
            </span>
          </div>
        </header>
        <main id="main" className="main-content">
          {children}
        </main>
        <footer className="footer">
          AI INFLUENCER STUDIO <span>Thoughtfully built for your next idea.</span>
        </footer>
      </div>
    </div>
  );
}
