import { ClipboardCheck, HeartHandshake, ShieldCheck, Workflow } from "lucide-react";
import { DIRECTORS } from "@/features/landing/landingData";

const ACCENT_STYLES = {
  sky: {
    avatar: "bg-sky-50 text-sky-700 ring-sky-100",
    icon: "text-sky-600",
    bar: "bg-sky-500",
  },
  emerald: {
    avatar: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    icon: "text-emerald-600",
    bar: "bg-emerald-500",
  },
  amber: {
    avatar: "bg-amber-50 text-amber-700 ring-amber-100",
    icon: "text-amber-600",
    bar: "bg-amber-500",
  },
  rose: {
    avatar: "bg-rose-50 text-rose-700 ring-rose-100",
    icon: "text-rose-600",
    bar: "bg-rose-500",
  },
};

const CARD_ICONS = [ShieldCheck, Workflow, ClipboardCheck, HeartHandshake];

export default function DirectorsSection() {
  return (
    <section id="leadership" className="bg-white py-20 sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[0.85fr_1.4fr] lg:px-8">
        <div className="landing-reveal">
          <p className="text-sm font-semibold text-blue-600">Leadership</p>
          <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight text-cyan-950 sm:text-4xl">
            Clinical leadership with a clear operating rhythm.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-cyan-800/75">
            Senior clinicians, nursing leads, and front-desk operations work from
            the same care record so every handoff has context.
          </p>
          <div className="mt-8 grid max-w-md gap-3 sm:grid-cols-2">
            <Signal label="Live registry data" value="Patient counts" />
            <Signal label="Care operations" value="Staff and specialties" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {DIRECTORS.map((director, i) => (
            <DirectorCard
              key={director.id}
              director={director}
              icon={CARD_ICONS[i % CARD_ICONS.length]}
              delayClass={`landing-delay-${Math.min(i + 1, 5)}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function DirectorCard({ director, icon, delayClass }) {
  const Icon = icon;
  const accent = ACCENT_STYLES[director.accent] ?? ACCENT_STYLES.sky;

  return (
    <div className={`landing-reveal ${delayClass} group rounded-md border border-cyan-100 bg-white p-5 shadow-sm shadow-cyan-950/4 transition hover:-translate-y-1 hover:border-cyan-200 hover:shadow-xl hover:shadow-cyan-950/8`}>
      <div className="flex items-start justify-between gap-4">
        <span className={`inline-flex size-12 items-center justify-center rounded-md text-sm font-semibold ring-1 ${accent.avatar}`}>
          {director.initials}
        </span>
        <Icon className={`size-5 ${accent.icon}`} />
      </div>
      <h3 className="mt-6 text-base font-semibold text-cyan-950">{director.title}</h3>
      <p className="mt-2 text-sm leading-6 text-cyan-800/75">{director.specialty}</p>
      <span className={`mt-6 block h-1 w-12 rounded-full ${accent.bar}`} />
    </div>
  );
}

function Signal({ label, value }) {
  return (
    <div className="rounded-md border border-cyan-100 bg-cyan-50/70 p-4">
      <p className="text-xs font-semibold text-blue-600">{label}</p>
      <p className="mt-2 text-sm font-semibold text-cyan-950">{value}</p>
    </div>
  );
}
