export default function ImoveisLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
      <div className="mb-8 space-y-2">
        <div className="h-3 w-32 animate-pulse rounded bg-border/70" />
        <div className="h-9 w-72 animate-pulse rounded-lg bg-border/80" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-border/60" />
      </div>

      <div className="h-24 animate-pulse rounded-2xl border border-border bg-surface" />

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-2xl border border-border bg-surface"
          >
            <div className="aspect-[4/3] animate-pulse bg-slate-200/70" />
            <div className="space-y-3 p-5">
              <div className="h-4 w-24 animate-pulse rounded bg-border/70" />
              <div className="h-5 w-3/4 animate-pulse rounded bg-border/80" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-border/60" />
              <div className="h-6 w-32 animate-pulse rounded bg-border/80" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
