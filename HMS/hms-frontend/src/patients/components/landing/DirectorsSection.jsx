import { DIRECTORS } from "@/features/landing/landingData";

const AVATAR_COLORS = [
  "bg-sky-100 text-sky-700",
  "bg-teal-100 text-teal-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
];

export default function DirectorsSection() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="Leadership"
          title="Medical Directors"
          subtitle="Our department heads bring decades of clinical and research experience from leading institutions worldwide."
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {DIRECTORS.map((director, i) => (
            <DirectorCard key={director.id} director={director} colorClass={AVATAR_COLORS[i % AVATAR_COLORS.length]} />
          ))}
        </div>
      </div>
    </section>
  );
}

function DirectorCard({ director, colorClass }) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-100 p-6 transition hover:shadow-md">
      <div className={`flex h-14 w-14 items-center justify-center rounded-full text-base font-semibold ${colorClass}`}>
        {director.initials}
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-900">{director.name}</p>
      <p className="text-xs text-sky-600">{director.title}</p>
      <p className="mt-2 text-xs text-slate-400">{director.specialty}</p>
    </div>
  );
}

function SectionHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="max-w-2xl">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-sky-500">{eyebrow}</p>
      <h2 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h2>
      {subtitle && <p className="mt-3 text-sm leading-relaxed text-slate-500">{subtitle}</p>}
    </div>
  );
}