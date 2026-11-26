export default function AdminPanelLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-52 animate-pulse rounded-lg bg-slate-200/80" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-200/60" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-xl border border-border bg-white"
          />
        ))}
      </div>

      <div className="h-72 animate-pulse rounded-xl border border-border bg-white" />
    </div>
  );
}
