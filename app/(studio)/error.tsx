'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="panel">
      <span className="badge">Connection needs attention</span>
      <h1>Your workspace is temporarily unavailable.</h1>
      <p>
        Check PostgreSQL is running and DATABASE_URL is configured. Follow docs/development.md, run
        npm run db:migrate, then try again. Your saved work has not been replaced with demo data.
      </p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
