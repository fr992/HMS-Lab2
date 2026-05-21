import { CountUpValue } from "@/features/dashboard/DashboardPrimitives";

export default function BedSummaryCards({ stats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <article key={stat.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  <CountUpValue value={stat.value} />
                </p>
              </div>
              <div className={`flex size-12 items-center justify-center rounded-lg ${stat.tone}`}>
                <Icon className="size-5" aria-hidden />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
