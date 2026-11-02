export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <p className="eyebrow">OPENING YOUR WORKSPACE</p>
      <div className="skeleton" />
      <div className="skeleton" />
      <p>Loading your studio…</p>
    </div>
  );
}
