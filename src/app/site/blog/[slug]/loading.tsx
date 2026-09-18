export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl animate-pulse px-5 py-14 sm:px-6">
      <div className="h-4 w-32 rounded bg-surface-2" />
      <div className="mt-6 h-10 w-3/4 rounded bg-surface-2" />
      <div className="mt-3 h-4 w-40 rounded bg-surface-2" />
      <div className="mt-8 h-56 w-full rounded-2xl bg-surface-2" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 w-full rounded bg-surface-2" style={{ width: `${90 - i * 6}%` }} />
        ))}
      </div>
    </div>
  );
}
