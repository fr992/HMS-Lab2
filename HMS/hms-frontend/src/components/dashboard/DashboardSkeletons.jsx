function SkeletonBlock({ className = "", ...props }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} {...props} />;
}

export function StatCardSkeleton() {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="mt-5 h-8 w-20" />
          <SkeletonBlock className="mt-3 h-3 w-32" />
        </div>
        <SkeletonBlock className="size-10 shrink-0 rounded-lg" />
      </div>
    </article>
  );
}

export function DashboardCardSkeleton({ rows = 5 }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <SkeletonBlock className="h-5 w-44" />
        <SkeletonBlock className="h-4 w-16" />
      </div>
      <TableSkeleton rows={rows} />
    </section>
  );
}

export function ChartSkeleton() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <SkeletonBlock className="h-5 w-40" />
      <div className="mt-6 flex h-56 items-end gap-3">
        {[45, 70, 52, 88, 64, 78, 58].map((height, index) => (
          <SkeletonBlock
            key={index}
            className="flex-1 rounded-t-lg"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </section>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <SkeletonBlock className="size-9 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <SkeletonBlock className="h-4 w-3/5" />
              <SkeletonBlock className="mt-2 h-3 w-4/5" />
            </div>
          </div>
          <SkeletonBlock className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

export function DashboardPageSkeleton({
  statCount = 6,
  cardCount = 2,
  columns = "lg:grid-cols-3",
}) {
  return (
    <>
      <section className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${columns}`}>
        {Array.from({ length: statCount }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: cardCount }).map((_, index) => (
          <DashboardCardSkeleton key={index} rows={index % 2 === 0 ? 5 : 4} />
        ))}
      </section>
    </>
  );
}
